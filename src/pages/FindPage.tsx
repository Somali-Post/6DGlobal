import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coordinate, generate6DCode } from "../lib/sixd";
import { createGoogleMapsAdapter, MapAdapter, MapAddress } from "../map/googleMapsAdapter";

const INITIAL_MAP_CENTER: Coordinate = { lat: 51.5074, lng: -0.1278 };

type MapLoadState = "loading" | "ready" | "missing-key" | "error";
type LocationState = "idle" | "locating" | "denied" | "unavailable" | "error";

type FormattedCode = {
  c2d: string;
  c4d: string;
  c6d: string;
};

type FinderResult = {
  code: FormattedCode;
  address: AddressLines;
};

type AddressLines = {
  line1: string;
  line2?: string;
  line3?: string;
};

type PanelState = {
  title: string;
  body: string;
};

export default function FindPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const adapter = useRef<MapAdapter | null>(null);
  const requestedInitialLocateRef = useRef(false);
  const latestCode = useRef<FormattedCode | null>(null);
  const latestSuffix = useRef("");
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [result, setResult] = useState<FinderResult | null>(null);
  const [pendingCode, setPendingCode] = useState<FormattedCode | null>(null);
  const autoLocate = useMemo(() => new URLSearchParams(window.location.search).get("locate") === "1", []);

  const handleLocate = useCallback((mapAdapter = adapter.current) => {
    if (mapLoadState !== "ready" || !mapAdapter) return;
    setLocationState("locating");

    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState("idle");
        mapAdapter.setPin({ lat: position.coords.latitude, lng: position.coords.longitude }, 18);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationState("denied");
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationState("unavailable");
          return;
        }

        setLocationState("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [mapLoadState]);

  useEffect(() => {
    let cancelled = false;
    if (!mapRef.current) return;

    setMapLoadState("loading");

    createGoogleMapsAdapter({
      element: mapRef.current,
      initial: INITIAL_MAP_CENTER,
      onPick: (coordinate) => {
        const sixd = generate6DCode(coordinate);
        latestCode.current = formatCode(sixd.code);
        latestSuffix.current = sixd.localitySuffix;
        setResult(null);
        setPendingCode(latestCode.current);
        setLocationState("idle");
      },
      onAddress: (address) => {
        if (!latestCode.current) return;
        setResult({
          code: latestCode.current,
          address: toAddressLines(address, latestSuffix.current),
        });
        setPendingCode(null);
      },
      onNotice: (message) => {
        console.warn("[find]", message);
      },
      onReady: () => {
        if (!cancelled) setMapLoadState("ready");
      },
    }).then((created) => {
      if (cancelled) {
        created?.destroy();
        return;
      }

      adapter.current = created;
      if (!created) {
        setMapLoadState("missing-key");
      }
    }).catch((error) => {
      console.warn("[find] Google Maps failed to initialise:", error);
      if (!cancelled) setMapLoadState("error");
    });

    return () => {
      cancelled = true;
      adapter.current?.destroy();
      adapter.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapLoadState !== "ready") return;
    if (requestedInitialLocateRef.current || !autoLocate) return;

    requestedInitialLocateRef.current = true;
    handleLocate();
  }, [autoLocate, handleLocate, mapLoadState]);

  const panelState = getFinderPanelState({
    mapLoadState,
    locationState,
    hasResult: Boolean(result),
  });

  return (
    <main className="find-map-page">
      <div className="find-map-page__fallback-surface" aria-hidden="true">
        <div className="find-map-page__fallback-crosshair" />
        <div className="find-map-page__fallback-label">6D grid preview</div>
      </div>

      <div
        ref={mapRef}
        className={`find-map-page__map ${mapLoadState === "ready" ? "is-ready" : ""}`}
        aria-hidden={mapLoadState !== "ready"}
      />

      <a className="find-map-page__logo" href="/" aria-label="6D Address home">
        <img src="/images/logo-compact.png" alt="" />
      </a>

      <button
        className="find-map-page__locate"
        type="button"
        onClick={() => handleLocate()}
        disabled={locationState === "locating" || mapLoadState !== "ready"}
        aria-label={locationState === "locating" ? "Finding your location" : "Use my location"}
      >
        <img src="/assets/geolocate.svg" alt="" aria-hidden="true" />
      </button>

      <FindInfoPanel panelState={panelState} pendingCode={pendingCode} result={result} />
    </main>
  );
}

function getFinderPanelState({
  mapLoadState,
  locationState,
  hasResult,
}: {
  mapLoadState: MapLoadState;
  locationState: LocationState;
  hasResult: boolean;
}): PanelState | null {
  if (hasResult) return null;

  if (mapLoadState === "missing-key") {
    return {
      title: "Map key not configured",
      body: "Add a Google Maps API key to enable the live finder.",
    };
  }

  if (mapLoadState === "error") {
    return {
      title: "Map unavailable",
      body: "The live map could not load. Check the connection, browser settings or map configuration.",
    };
  }

  if (mapLoadState === "loading") {
    return {
      title: "Loading map",
      body: "Preparing the 6D Address finder.",
    };
  }

  if (locationState === "locating") {
    return {
      title: "Locating...",
      body: "Allow location access to calculate your 6D Address.",
    };
  }

  if (locationState === "denied") {
    return mapLoadState === "ready"
      ? {
          title: "Location permission denied",
          body: "You can still click on the map to choose a location.",
        }
      : {
          title: "Location permission denied",
          body: "The live map is not available yet.",
        };
  }

  if (locationState === "unavailable" || locationState === "error") {
    return mapLoadState === "ready"
      ? {
          title: "Location unavailable",
          body: "Your browser could not provide a location. You can choose a point on the map manually.",
        }
      : {
          title: "Location unavailable",
          body: "Your browser could not provide a location and the live map is not available yet.",
        };
  }

  return {
    title: "Click on the map to generate",
    body: "Choose a location to calculate a 6D Address.",
  };
}

function FindInfoPanel({
  panelState,
  pendingCode,
  result,
}: {
  panelState: PanelState | null;
  pendingCode: FormattedCode | null;
  result: FinderResult | null;
}) {
  return (
    <section
      className={`find-map-page__panel ${result ? "has-result" : ""}`}
      aria-live="polite"
      aria-label="6D Address result"
    >
      {result ? (
        <>
          <p className="find-map-page__panel-label">6D Address</p>
          <FindCode code={result.code} />
          <address className="find-map-page__address-lines">
            <span>{result.address.line1}</span>
            {result.address.line2 && <span>{result.address.line2}</span>}
            {result.address.line3 && <span>{result.address.line3}</span>}
          </address>
        </>
      ) : pendingCode ? (
        <>
          <p className="find-map-page__panel-label">6D Address</p>
          <FindCode code={pendingCode} />
          <p className="find-map-page__panel-body">Resolving locality information for the selected point.</p>
        </>
      ) : (
        <>
          <p className="find-map-page__panel-title">{panelState?.title}</p>
          <p className="find-map-page__panel-body">{panelState?.body}</p>
        </>
      )}
    </section>
  );
}

function FindCode({ code }: { code: FormattedCode }) {
  return (
    <div className="find-map-page__code" aria-label={`${code.c2d}-${code.c4d}-${code.c6d}`}>
      <span className="code-2d">{code.c2d}</span>
      <span className="code-sep">-</span>
      <span className="code-4d">{code.c4d}</span>
      <span className="code-sep">-</span>
      <span className="code-6d">{code.c6d}</span>
    </div>
  );
}

function formatCode(code: string): FormattedCode {
  const [c2d, c4d, c6d] = code.split("-");
  return { c2d, c4d, c6d };
}

function toAddressLines(address: MapAddress, suffix: string): AddressLines {
  const locality = address.locality === "Unknown locality" ? "Locality unavailable" : address.locality;
  const line1 = [locality, suffix].filter(Boolean).join(" ").trim();
  const isUk = address.country === "United Kingdom";
  const line2 = isUk
    ? (address.postalTown || address.city || address.region || "")
    : [address.city, address.region].filter(Boolean).join(", ") || address.cityLine;
  const line3 = isUk ? "United Kingdom" : address.country || "";

  return { line1, line2, line3 };
}
