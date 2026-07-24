import { Coordinate, snapToGridCenter } from "../lib/sixd";
import { createGridOverlay } from "./gridOverlay";

type MapsWindow = Window & {
  google?: any;
  __init6DMap?: () => void;
};

let googleMapsPromise: Promise<any> | null = null;
let somaliaDistrictsPromise: Promise<any[] | null> | null = null;

export type MapAddress = {
  locality: string;
  cityLine: string;
  city?: string;
  region?: string;
  country?: string;
};

export type MapAdapter = {
  setPin: (coordinate: Coordinate, zoom?: number) => void;
  useMyLocation: () => void;
  destroy: () => void;
};

export async function createGoogleMapsAdapter(args: {
  element: HTMLElement;
  initial: Coordinate;
  onPick: (coordinate: Coordinate) => void;
  onAddress: (address: MapAddress) => void;
  onNotice: (message: string) => void;
  onReady?: () => void;
}): Promise<MapAdapter | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const google = await loadGoogleMaps(apiKey);
  if (!google?.maps) return null;

  const map = new google.maps.Map(args.element, {
    center: args.initial,
    zoom: 13,
    disableDefaultUI: true,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    cameraControl: false,
    clickableIcons: false,
    gestureHandling: "greedy",
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
      { featureType: "landscape", stylers: [{ saturation: -35 }, { lightness: 12 }] },
      { featureType: "road", elementType: "geometry", stylers: [{ lightness: 24 }] },
    ],
  });

  const geocoder = new google.maps.Geocoder();
  const overlay = createGridOverlay(google, map);
  let marker: any = null;

  const pick = (latLng: any) => {
    if (!latLng || typeof latLng.lat !== "function" || typeof latLng.lng !== "function") return;
    const coordinate = snapToGridCenter({ lat: latLng.lat(), lng: latLng.lng() });
    if (!marker) {
      marker = new google.maps.Marker({
        position: coordinate,
        map,
        draggable: true,
        icon: pinSymbol(google),
      });
      marker.addListener("dragend", (event: any) => pick(event.latLng));
    }
    marker.setPosition(coordinate);
    map.panTo(coordinate);
    overlay.drawSelectedBoxes(coordinate);
    args.onPick(coordinate);
    resolveAddress(google, geocoder, coordinate, args.onAddress);
  };

  const mapClick = map.addListener("click", (event: any) => pick(event?.latLng));
  const idleListener = map.addListener("idle", overlay.updateDynamicGrid);
  const readyListener = google.maps.event.addListenerOnce(map, "tilesloaded", () => args.onReady?.());
  overlay.updateDynamicGrid();

  const setPin = (coordinate: Coordinate, zoom = 17) => {
    map.setZoom(zoom);
    pick(new google.maps.LatLng(coordinate.lat, coordinate.lng));
  };

  return {
    setPin,
    useMyLocation() {
      if (!navigator.geolocation) {
        args.onNotice("This browser does not support location lookup. Click the map to choose a location manually.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPin({ lat: position.coords.latitude, lng: position.coords.longitude }, 18);
        },
        () => {
          args.onNotice("Location access was not allowed. Click the map to choose a location manually.");
        },
        { enableHighAccuracy: true, timeout: 12000 },
      );
    },
    destroy() {
      google.maps.event.removeListener(mapClick);
      google.maps.event.removeListener(idleListener);
      google.maps.event.removeListener(readyListener);
      overlay.destroy();
      marker?.setMap(null);
    },
  };
}

function loadGoogleMaps(apiKey: string): Promise<any> {
  const w = window as MapsWindow;
  if (w.google?.maps?.geometry) return Promise.resolve(w.google);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    w.__init6DMap = () => resolve(w.google);
    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__init6DMap&v=weekly&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function resolveAddress(
  google: any,
  geocoder: any,
  coordinate: Coordinate,
  onAddress: (address: MapAddress) => void,
) {
  const fallback: MapAddress = {
    locality: "Unknown locality",
    cityLine: "Manual pin",
  };

  geocoder.geocode({ location: coordinate }, (results?: any[], status?: string) => {
    if (status !== "OK" || !Array.isArray(results) || !results[0]) {
      onAddress(fallback);
      return;
    }

    // Only use administrative/locality components for the 6D address.
    // Do not use POI, building, route, premise, or formatted_address values here.
    const components = results[0].address_components ?? [];
    const byType = (type: string) => components.find((c: any) => Array.isArray(c.types) && c.types.includes(type))?.long_name;
    const country = byType("country");
    const region = byType("administrative_area_level_1");
    const district = byType("administrative_area_level_2");
    const sublocality = byType("sublocality_level_1") || byType("sublocality") || byType("neighborhood");
    const city = byType("locality") || (region === "Banaadir" ? "Mogadishu" : undefined) || district;
    const locality = sublocality || district || city || "Unknown locality";
    const cleanCountry = country || (region === "Banaadir" ? "Somalia" : undefined);
    const cleanRegion = region;

    resolveSomaliaDistrict(google, coordinate).then((districtBoundary) => {
      const finalLocality = districtBoundary?.district || locality;
      const finalRegion = districtBoundary?.region || cleanRegion;
      const finalCity = finalRegion === "Banaadir" ? "Mogadishu" : city;
      const finalCountry = districtBoundary ? "Somalia" : cleanCountry;

      onAddress({
        locality: finalLocality,
        city: finalCity,
        region: finalRegion,
        country: finalCountry,
        cityLine: [finalCity, finalRegion, finalCountry].filter(Boolean).join(", ") || fallback.cityLine,
      });
    });
  });
}

async function loadSomaliaDistricts() {
  if (somaliaDistrictsPromise) return somaliaDistrictsPromise;
  somaliaDistrictsPromise = fetch("/data/somalia_districts.geojson", { cache: "force-cache" })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => Array.isArray(data?.features) ? data.features : null)
    .catch(() => null);
  return somaliaDistrictsPromise;
}

async function resolveSomaliaDistrict(google: any, coordinate: Coordinate): Promise<{ district?: string; region?: string } | null> {
  if (!google.maps.geometry?.poly?.containsLocation) return null;
  const features = await loadSomaliaDistricts();
  if (!features) return null;

  const point = new google.maps.LatLng(coordinate.lat, coordinate.lng);
  for (const feature of features) {
    const geometry = feature?.geometry;
    const properties = feature?.properties ?? {};
    const rings = geometryToRings(geometry);
    for (const ringSet of rings) {
      const polygon = new google.maps.Polygon({ paths: ringSet });
      if (google.maps.geometry.poly.containsLocation(point, polygon)) {
        return {
          district: properties.NAME_2 || properties.name_2 || properties.district,
          region: properties.NAME_1 || properties.name_1 || properties.region,
        };
      }
    }
  }

  return null;
}

function geometryToRings(geometry: any): Array<Array<{ lat: number; lng: number }>> {
  if (!geometry?.coordinates) return [];
  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0].map((point: number[]) => ({ lat: point[1], lng: point[0] }))];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon: number[][][]) => polygon[0].map((point: number[]) => ({ lat: point[1], lng: point[0] })));
  }
  return [];
}

function pinSymbol(google: any) {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 54 54">
        <filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#05070A" flood-opacity=".28"/></filter>
        <g filter="url(#s)">
          <circle cx="27" cy="23" r="17" fill="#006CE3"/>
          <circle cx="27" cy="23" r="11" fill="#00B8FF" opacity=".55"/>
          <circle cx="27" cy="23" r="6" fill="#fff"/>
          <text x="27" y="43" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="800" fill="#006CE3">6D</text>
        </g>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(54, 54),
    anchor: new google.maps.Point(27, 27),
  };
}
