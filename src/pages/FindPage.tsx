import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapLoadingScreen } from "../components/MapLoadingScreen";
import { NoWrap6D, renderNoWrap6D } from "../components/NoWrap6D";
import { landmarkExamples, type LandmarkExample } from "../data/landmarkExamples";
import { getLandmarkStreetLine } from "../lib/landmarkDisplay";
import { Coordinate, generate6DCode } from "../lib/sixd";
import { createGoogleMapsAdapter, MapAdapter } from "../map/googleMapsAdapter";

const INITIAL_MAP_CENTER: Coordinate = { lat: 51.5074, lng: -0.1278 };
const MAP_LOADER_MINIMUM_MS = 800;
const MAP_LOADER_FADE_MS = 320;
type MapLoadState = "loading" | "ready" | "missing-key" | "error";
type LocationState = "idle" | "locating" | "denied" | "unavailable" | "error";
type FormattedCode = { c2d: string; c4d: string; c6d: string };
type FinderResult = { code: FormattedCode; landmark?: LandmarkExample };
type PanelState = { title: string; body: string };

function parseUrlCoordinate(params: URLSearchParams): Coordinate | null {
  if (!params.has("lat") || !params.has("lng")) return null;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;
}

function replaceFindUrl({ coordinate, landmark }: { coordinate?: Coordinate; landmark?: string } = {}) {
  const params = new URLSearchParams();
  if (coordinate) { params.set("lat", String(coordinate.lat)); params.set("lng", String(coordinate.lng)); }
  if (landmark) params.set("landmark", landmark);
  const query = params.toString().replace(/\+/g, "%20");
  window.history.replaceState(window.history.state, "", `/find${query ? `?${query}` : ""}`);
}

export default function FindPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const adapter = useRef<MapAdapter | null>(null);
  const requestedInitialActionRef = useRef(false);
  const selectedCoordinate = useRef<Coordinate | null>(null);
  const landmarkMode = useRef<LandmarkExample | null>(null);
  const loaderStartedAt = useRef(performance.now());
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");
  const [showMapLoader, setShowMapLoader] = useState(true);
  const [mapLoaderExiting, setMapLoaderExiting] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [result, setResult] = useState<FinderResult | null>(null);
  const [pendingCode, setPendingCode] = useState<FormattedCode | null>(null);
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const autoLocate = useMemo(() => initialParams.get("locate") === "1", [initialParams]);
  const initialLandmark = useMemo(() => {
    if (!parseUrlCoordinate(initialParams)) return null;
    const id = initialParams.get("landmark");
    return id ? landmarkExamples.find((example) => example.id === id) ?? null : null;
  }, [initialParams]);

  const handleLocate = useCallback((mapAdapter = adapter.current) => {
    if (mapLoadState !== "ready" || !mapAdapter) return;
    if (landmarkMode.current) {
      landmarkMode.current = null;
      if (selectedCoordinate.current) mapAdapter.setPin(selectedCoordinate.current, 18);
      else { setResult(null); setPendingCode(null); replaceFindUrl(); }
    }
    setLocationState("locating");
    if (!navigator.geolocation) { setLocationState("unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocationState("idle"); mapAdapter.setPin({ lat: coords.latitude, lng: coords.longitude }, 18); },
      (error) => setLocationState(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.POSITION_UNAVAILABLE ? "unavailable" : "error"),
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
      onPick: (coordinate, source) => {
        const sixd = generate6DCode(coordinate);
        const code = formatCode(sixd.code);
        selectedCoordinate.current = coordinate;
        const landmark = source === "landmark" ? initialLandmark : null;
        landmarkMode.current = landmark;
        setResult(landmark ? { code: formatCode(landmark.code), landmark } : { code });
        setPendingCode(null);
        setLocationState("idle");
        if (source !== "initial" && source !== "landmark") replaceFindUrl({ coordinate });
      },
      onAddress: () => undefined,
      onNotice: (message) => console.warn("[find]", message),
      onReady: () => { if (!cancelled) setMapLoadState("ready"); },
    }).then((created) => {
      if (cancelled) { created?.destroy(); return; }
      adapter.current = created;
      if (!created) setMapLoadState("missing-key");
    }).catch((error) => { console.warn("[find] Google Maps failed to initialise:", error); if (!cancelled) setMapLoadState("error"); });
    return () => { cancelled = true; adapter.current?.destroy(); adapter.current = null; };
  }, [initialLandmark]);

  useEffect(() => {
    if (mapLoadState === "loading") return;
    const remaining = Math.max(0, MAP_LOADER_MINIMUM_MS - (performance.now() - loaderStartedAt.current));
    let hideTimer = 0;
    const exitTimer = window.setTimeout(() => { setMapLoaderExiting(true); hideTimer = window.setTimeout(() => setShowMapLoader(false), MAP_LOADER_FADE_MS); }, remaining);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(hideTimer); };
  }, [mapLoadState]);

  useEffect(() => {
    if (mapLoadState !== "ready" || requestedInitialActionRef.current || !adapter.current) return;
    const coordinate = parseUrlCoordinate(initialParams);
    if (!coordinate) return;
    requestedInitialActionRef.current = true;
    setLocationState("idle");
    adapter.current.setPin(coordinate, 18, initialLandmark ? "landmark" : "initial");
  }, [initialLandmark, initialParams, mapLoadState]);

  useEffect(() => {
    if (mapLoadState !== "ready" || requestedInitialActionRef.current || !autoLocate) return;
    requestedInitialActionRef.current = true;
    handleLocate();
  }, [autoLocate, handleLocate, mapLoadState]);

  const panelState = getFinderPanelState({ mapLoadState, locationState, hasResult: Boolean(result) });
  return <main className="find-map-page">
    <div className="find-map-page__fallback-surface" aria-hidden="true"><div className="find-map-page__fallback-crosshair" /><div className="find-map-page__fallback-label">6D grid preview</div></div>
    <div ref={mapRef} className={`find-map-page__map ${mapLoadState === "ready" ? "is-ready" : ""}`} aria-hidden={mapLoadState !== "ready"} />
    {showMapLoader && <MapLoadingScreen isExiting={mapLoaderExiting} />}
    <a className="find-map-page__logo" href="/" aria-label="6D Address home"><img src="/images/logo-compact.png" alt="" /></a>
    <button className="find-map-page__locate" type="button" onClick={() => handleLocate()} disabled={locationState === "locating" || mapLoadState !== "ready"} aria-label={locationState === "locating" ? "Finding your location" : "Use my location"}><img src="/assets/geolocate.svg" alt="" aria-hidden="true" /></button>
    <FindInfoPanel panelState={panelState} pendingCode={pendingCode} result={result} />
  </main>;
}

function getFinderPanelState({ mapLoadState, locationState, hasResult }: { mapLoadState: MapLoadState; locationState: LocationState; hasResult: boolean }): PanelState | null {
  if (hasResult) return null;
  if (mapLoadState === "missing-key") return { title: "Map key not configured", body: "Add a Google Maps API key to enable the live finder." };
  if (mapLoadState === "error") return { title: "Map unavailable", body: "The live map could not load. Check the connection, browser settings or map configuration." };
  if (mapLoadState === "loading") return { title: "Loading map", body: "Preparing the 6D Address finder." };
  if (locationState === "locating") return { title: "Locating...", body: "Allow location access to calculate your 6D Address." };
  if (locationState === "denied") return { title: "Location permission denied", body: mapLoadState === "ready" ? "You can still click on the map to choose a location." : "The live map is not available yet." };
  if (locationState === "unavailable" || locationState === "error") return { title: "Location unavailable", body: mapLoadState === "ready" ? "Your browser could not provide a location. You can choose a point on the map manually." : "Your browser could not provide a location and the live map is not available yet." };
  return { title: "Click on the map to generate", body: "Choose a location to calculate a 6D Address." };
}

function FindInfoPanel({ panelState, pendingCode, result }: { panelState: PanelState | null; pendingCode: FormattedCode | null; result: FinderResult | null }) {
  const street = result?.landmark ? getLandmarkStreetLine(result.landmark) : undefined;
  if (result?.landmark) return <section className="find-map-page__panel has-result" aria-live="polite" aria-label="6D Address result"><h2 className="find-map-page__landmark-name">{result.landmark.name}</h2><address className="find-map-page__address-lines find-map-page__address-lines--landmark">{street && <span>{street}</span>}<div className="find-map-page__landmark-code-line"><FindCode code={result.code} /><span>{result.landmark.locality}</span></div>{result.landmark.cityLine && <span>{result.landmark.cityLine}</span>}<span>{result.landmark.country}</span></address></section>;
  return <section className={`find-map-page__panel ${result ? "has-result find-map-page__panel--locality" : ""}`} aria-live="polite" aria-label="6D Address result">
    {result ? <><p className="find-map-page__panel-label"><NoWrap6D /></p><FindCode code={result.code} /><div className="find-map-page__locality-prompt"><a className="cta-action cta-action--blue" href="/#contact"><span>Contact us to discuss how to add your locality information</span><span className="cta-arrow" aria-hidden="true">→</span></a></div></> : pendingCode ? <><p className="find-map-page__panel-label"><NoWrap6D /></p><FindCode code={pendingCode} /><p className="find-map-page__panel-body">Resolving locality information for the selected point.</p></> : <><p className="find-map-page__panel-title">{panelState?.title}</p><p className="find-map-page__panel-body">{panelState?.body ? renderNoWrap6D(panelState.body) : null}</p></>}
  </section>;
}

function FindCode({ code }: { code: FormattedCode }) { return <div className="find-map-page__code" aria-label={`${code.c2d}-${code.c4d}-${code.c6d}`}><span className="code-2d">{code.c2d}</span><span className="code-sep">-</span><span className="code-4d">{code.c4d}</span><span className="code-sep">-</span><span className="code-6d">{code.c6d}</span></div>; }
function formatCode(code: string): FormattedCode { const [c2d, c4d, c6d] = code.split("-"); return { c2d, c4d, c6d }; }
