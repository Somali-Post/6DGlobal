import { generate6DCode } from "../src/lib/sixd.ts";

type CitySearch = {
  name: string;
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
};

type CandidatePoint = {
  city: string;
  code: string;
  lat: number;
  lng: number;
};

type ReverseGeocodeResult = {
  locality: string;
  city: string;
  lat: number;
  lng: number;
  code: string;
  displayName: string;
};

const cities: CitySearch[] = [
  { name: "London", bbox: { minLat: 51.28, maxLat: 51.7, minLng: -0.5, maxLng: 0.18 } },
  { name: "New York", bbox: { minLat: 40.49, maxLat: 40.92, minLng: -74.27, maxLng: -73.68 } },
  { name: "Paris", bbox: { minLat: 48.78, maxLat: 48.92, minLng: 2.22, maxLng: 2.47 } },
  { name: "Istanbul", bbox: { minLat: 40.85, maxLat: 41.25, minLng: 28.58, maxLng: 29.4 } },
  { name: "Lagos", bbox: { minLat: 6.37, maxLat: 6.7, minLng: 3.05, maxLng: 3.65 } },
];

const verifiedLondonPoints = [
  { city: "London", lat: 51.58505, lng: -0.18505 },
  { city: "London", lat: 51.58505, lng: -0.08505 },
  { city: "London", lat: 51.48505, lng: -0.08505 },
  { city: "London", lat: 51.38505, lng: -0.08505 },
].map((point) => ({ ...point, code: generate6DCode(point).code }));

const targetOffsets = [0.08505, 0.07505, 0.06505, 0.05505, 0.04505, 0.03505, 0.02505, 0.01505, 0.00505, 0.09505];

function candidatePointsForCity(city: CitySearch): CandidatePoint[] {
  const points: CandidatePoint[] = [];
  const latWhole = Math.floor(city.bbox.minLat);
  const lngWhole = Math.trunc(city.bbox.minLng);

  for (const latOffset of targetOffsets) {
    for (const lngOffset of targetOffsets) {
      for (let latFirst = 0; latFirst <= 9; latFirst += 1) {
        for (let lngFirst = 0; lngFirst <= 9; lngFirst += 1) {
          const lat = latWhole + latFirst / 10 + latOffset;
          const lngMagnitude = Math.abs(lngWhole) + lngFirst / 10 + lngOffset;
          const lng = city.bbox.minLng < 0 ? -lngMagnitude : lngMagnitude;

          if (lat < city.bbox.minLat || lat > city.bbox.maxLat || lng < city.bbox.minLng || lng > city.bbox.maxLng) {
            continue;
          }

          points.push({ city: city.name, lat, lng, code: generate6DCode({ lat, lng }).code });
        }
      }
    }
  }

  return points;
}

function pickLocality(address: Record<string, string | undefined>, fallbackName?: string) {
  return (
    fallbackName ||
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district ||
    address.borough ||
    fallbackName ||
    ""
  ).trim();
}

async function reverseGeocode(point: CandidatePoint): Promise<ReverseGeocodeResult | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(point.lat),
    lon: String(point.lng),
    zoom: "14",
    addressdetails: "1",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "User-Agent": "6daddress-locality-research/1.0" },
  });

  if (!response.ok) return null;

  const json = await response.json() as {
    name?: string;
    display_name?: string;
    address?: Record<string, string | undefined>;
  };
  const address = json.address ?? {};
  const locality = pickLocality(address, json.name);
  const resolvedCity = address.city || address.town || address.municipality || address.county || point.city;

  if (!locality || locality.length < 4) return null;

  return {
    locality,
    city: resolvedCity,
    lat: point.lat,
    lng: point.lng,
    code: point.code,
    displayName: json.display_name ?? "",
  };
}

async function main() {
  const verifiedCode = verifiedLondonPoints[0]?.code;
  if (verifiedCode && verifiedLondonPoints.every((point) => point.code === verifiedCode)) {
    const locations: ReverseGeocodeResult[] = [];

    for (const point of verifiedLondonPoints) {
      const result = await reverseGeocode(point);
      if (!result) throw new Error(`Could not reverse geocode ${point.lat}, ${point.lng}`);
      locations.push({ ...result, city: "London" });
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    if (new Set(locations.map((location) => location.locality)).size === 4) {
      console.log(JSON.stringify({ sharedCode: verifiedCode, city: "London", locations }, null, 2));
      return;
    }
  }

  for (const city of cities) {
    const groups = new Map<string, CandidatePoint[]>();

    for (const point of candidatePointsForCity(city)) {
      const group = groups.get(point.code);
      if (group) group.push(point);
      else groups.set(point.code, [point]);
    }

    const promisingGroups = [...groups.entries()]
      .filter(([, points]) => points.length >= 4)
      .sort((a, b) => b[1].length - a[1].length);

    for (const [code, points] of promisingGroups) {
      const resolved: ReverseGeocodeResult[] = [];

      for (const point of points.slice(0, 12)) {
        const result = await reverseGeocode(point);
        if (result && !resolved.some((existing) => existing.locality === result.locality)) {
          resolved.push(result);
        }

        if (resolved.length === 4) {
          console.log(JSON.stringify({ sharedCode: code, city: city.name, locations: resolved }, null, 2));
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }
  }

  throw new Error("No clean four-locality match found.");
}

await main();
