import { useEffect, useMemo, useRef, useState } from "react";
import { Coordinate, generate6DCode } from "../lib/sixd";
import { createGoogleMapsAdapter, MapAdapter, MapAddress } from "../map/googleMapsAdapter";

const MOGADISHU: Coordinate = { lat: 2.0469, lng: 45.3182 };

export default function FindPage({ onClose }: { onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const adapter = useRef<MapAdapter | null>(null);
  const requestedLocation = useRef(false);
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [address, setAddress] = useState<MapAddress | null>(null);
  const [notice, setNotice] = useState("Choose a location to create a 6D address.");
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "missing-key" | "error">("loading");
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLocality, setShowLocality] = useState(false);
  const autoLocate = new URLSearchParams(window.location.search).get("locate") === "1";
  const sixd = useMemo(() => coordinate ? generate6DCode(coordinate) : null, [coordinate]);
  const fallbackPinStyle = useMemo(() => {
    if (!coordinate) return undefined;
    const x = 50 + ((coordinate.lng - MOGADISHU.lng) / 0.08) * 100;
    const y = 50 - ((coordinate.lat - MOGADISHU.lat) / 0.08) * 100;
    return { left: `${Math.max(4, Math.min(96, x))}%`, top: `${Math.max(4, Math.min(96, y))}%` };
  }, [coordinate]);
  const complete = useMemo(
    () => sixd && address
      ? [
        `${sixd.code} ${address.locality}`,
        address.city,
        [address.region, address.country].filter(Boolean).join(", ") || address.cityLine,
      ].filter(Boolean).join("\n")
      : "",
    [address, sixd],
  );

  useEffect(() => {
    let cancelled = false;
    if (!mapRef.current) return;
    const startedAt = performance.now();
    let readyTimer = 0;
    let readyFallbackTimer = 0;
    const markReady = () => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, 2200 - elapsed);
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(() => {
        if (!cancelled) setMapStatus("ready");
      }, wait);
    };

    createGoogleMapsAdapter({
      element: mapRef.current,
      initial: MOGADISHU,
      onPick: (picked) => {
        setCoordinate(picked);
        setDenied(false);
        setNotice("Selected location. Move the pin if the entrance or delivery point is different.");
      },
      onAddress: (resolved) => setAddress(resolved),
      onNotice: setNotice,
      onReady: markReady,
    }).then((created) => {
      if (cancelled) {
        created?.destroy();
        return;
      }
      adapter.current = created;
      if (!created) {
        setMapStatus("missing-key");
        setNotice("Map key missing. Add VITE_GOOGLE_MAPS_API_KEY to .env.local.");
      } else {
        readyFallbackTimer = window.setTimeout(markReady, 8000);
      }
      if (autoLocate && !requestedLocation.current) requestLocation(created);
    }).catch((error) => {
      console.error("[find] Google Maps failed to initialise:", error);
      if (!cancelled) {
        setMapStatus("error");
        setNotice("The map could not load. Check the Google Maps API key and browser restrictions.");
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(readyTimer);
      window.clearTimeout(readyFallbackTimer);
      adapter.current?.destroy();
    };
  }, []);

  const selectFallbackCoordinate = (picked: Coordinate) => {
    setCoordinate(picked);
    setAddress({
      locality: "Unknown locality",
      city: "Manual pin",
      cityLine: "Manual pin",
    });
    setDenied(false);
  };

  const requestLocation = (mapAdapter = adapter.current) => {
    requestedLocation.current = true;
    setLocating(true);
    setDenied(false);
    setNotice("Waiting for location permission...");
    if (!navigator.geolocation) {
      setLocating(false);
      setDenied(true);
        setNotice("This browser does not support location lookup. Click the map to choose a location manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const picked = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocating(false);
        if (mapAdapter) mapAdapter.setPin(picked, 18);
        else selectFallbackCoordinate(picked);
        setNotice("Location found. Move the pin if the entrance or delivery point is different.");
      },
      () => {
        setLocating(false);
        setDenied(true);
        setNotice("Location access was not allowed. Click the map to choose a location manually.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const copy = async () => {
    if (!complete) return;
    await navigator.clipboard?.writeText(complete);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    if (!complete) return;
    if (navigator.share) await navigator.share({ title: "6D Address", text: complete });
    else await copy();
  };

  const canUseFallbackPin = mapStatus === "missing-key";
  const panelMode = locating || mapStatus === "loading" ? "loading" : coordinate && sixd && address ? "result" : denied ? "denied" : mapStatus === "error" ? "map-error" : "empty";
  const isMapLoadingScreen = panelMode === "loading";

  return (
    <main className="finder">
      <div
        className="map-stage"
        onClick={(event) => {
          if (adapter.current || !canUseFallbackPin) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          selectFallbackCoordinate({ lat: MOGADISHU.lat - y * 0.08, lng: MOGADISHU.lng + x * 0.08 });
          setNotice("Preview pin selected. Add a Google Maps key for live reverse geocoding.");
        }}
      >
        <div className="map-canvas" ref={mapRef} />
        {mapStatus !== "ready" && (
        <div className={`fallback-map ${mapStatus === "error" ? "error" : ""}`}>
          {mapStatus !== "loading" && <span className="fallback-route" />}
          {mapStatus !== "loading" && coordinate && <span className="fallback-pin" style={fallbackPinStyle} />}
          <div className="map-message">
            {mapStatus === "loading" && <MapLoader />}
            {mapStatus === "missing-key" && "Map key missing. Add VITE_GOOGLE_MAPS_API_KEY to .env.local."}
            {mapStatus === "error" && "The map could not load. Check the Google Maps API key and browser restrictions."}
          </div>
        </div>
        )}
      </div>

      <header className={`finder-top ${isMapLoadingScreen ? "loading-only" : ""}`}>
        <button className="icon-button" onClick={onClose} aria-label="Return to homepage">x</button>
        {!isMapLoadingScreen && <img src="/logo-256.webp" alt="6D Address" />}
        {!isMapLoadingScreen && (
          <button className="location-control" onClick={() => requestLocation()} aria-label="Use my location">
            <LocationIcon /> <span>Use my location</span>
          </button>
        )}
      </header>

      {!isMapLoadingScreen && <aside className="finder-sheet">
        {panelMode === "result" ? (
          <>
            <div className="sheet-kicker"><span className="status-dot" /> Selected location</div>
            {sixd && <SixDCode code={sixd.code} />}
            <p className="sheet-locality">{address?.locality}</p>
            <pre>{complete}</pre>
          </>
        ) : (
          <div className="empty-panel">
            <p className="sheet-kicker muted">Create a 6D address</p>
            <h2>
              {panelMode === "denied" && "Choose a location manually"}
              {panelMode === "map-error" && "Map unavailable"}
              {panelMode === "empty" && "Create your 6D address"}
            </h2>
            <p>
              {panelMode === "denied" && "Location access was not allowed. Click the map to choose a location manually."}
              {panelMode === "map-error" && "The map could not load. Check the Google Maps API key and browser restrictions."}
              {panelMode === "empty" && "Click the map or use your current location to create a 6D address."}
            </p>
          </div>
        )}
        <p className="notice">{notice}</p>
        {complete && <div className="finder-actions">
          {complete && <button onClick={copy}>{copied ? "Copied" : "Copy"}</button>}
          {complete && <button onClick={share}>Share</button>}
        </div>}
        <button className="locality-link" onClick={() => setShowLocality(true)}>Why locality matters</button>
        {complete && <p className="result-note">A complete 6D address is the six-digit reference plus locality. The digits alone are not globally unique.</p>}
      </aside>}
      {showLocality && (
        <div className="modal-backdrop" onClick={() => setShowLocality(false)}>
          <section className="locality-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLocality(false)} aria-label="Close locality explanation">x</button>
            <h2>Why locality matters</h2>
            <p>The six digits are a reference, not the whole address. The same digits can appear in more than one place. Locality tells a compatible app which matching position you mean.</p>
          </section>
        </div>
      )}
    </main>
  );
}

function MapLoader() {
  return (
    <div className="map-loader" role="status" aria-live="polite" aria-label="Loading Global Map">
      <img className="map-loader-brand" src="/navlogo-dark-320.webp" alt="6D Address" />
      <span className="map-loader-mark" aria-hidden="true">
        <span className="map-loader-square red" />
        <span className="map-loader-square green" />
        <span className="map-loader-square blue" />
      </span>
      <span className="map-loader-copy">
        <strong>Loading Global Map</strong>
        <small>Preparing map tiles, grid references, and location tools.</small>
      </span>
      <span className="map-loader-progress" aria-hidden="true">
        <span className="map-loader-progress-track"><span /></span>
        <span className="map-loader-progress-meta">
          <span>Syncing</span>
          <span>Global map</span>
        </span>
      </span>
    </div>
  );
}

function SixDCode({ code }: { code: string }) {
  const pairs = code.split("-");

  return (
    <h1 className="sheet-code" aria-label={code}>
      {pairs.map((pair, index) => (
        <span className={`sheet-code-pair tone-${index === 0 ? "red" : index === 1 ? "green" : "blue"}`} key={`${pair}-${index}`}>
          {pair}
        </span>
      ))}
    </h1>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.8" />
    </svg>
  );
}
