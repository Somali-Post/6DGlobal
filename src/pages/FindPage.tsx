import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CitySearch } from "./CitySearch";
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
  const loaderStartedAt = useRef(performance.now());
  const [attempt, setAttempt] = useState(0);
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
    loaderStartedAt.current = performance.now();
    setShowMapLoader(true);
    setMapLoaderExiting(false);
    requestedInitialActionRef.current = false;
    setMapLoadState("loading");
    createGoogleMapsAdapter({
      element: mapRef.current,
      initial: INITIAL_MAP_CENTER,
      onPick: (coordinate, source) => {
        const sixd = generate6DCode(coordinate);
        const code = formatCode(sixd.code);
        const landmark = source === "landmark" ? initialLandmark : null;
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
  }, [initialLandmark, attempt]);

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

    <div className="finder-tools">
    {mapLoadState === "ready" && <CitySearch search={(query) => adapter.current!.searchAreas(query)} onSelect={(area) => adapter.current?.selectArea(area)} />}
    {panelState && result && <div className="finder-notice" role="status"><strong>{panelState.title}</strong><p>{panelState.body} Your previous selection is still shown.</p></div>}
    {(mapLoadState === "error" || mapLoadState === "missing-key") && <button className="finder-retry" onClick={() => setAttempt(value => value + 1)}>Retry map</button>}
    </div>
    <FindInfoPanel panelState={panelState} pendingCode={pendingCode} result={result}><FinderActions result={result} locationState={locationState} mapReady={mapLoadState === "ready"} onLocate={() => handleLocate()} /></FindInfoPanel>
  </main>;
}

function getFinderPanelState({ mapLoadState, locationState, hasResult }: { mapLoadState: MapLoadState; locationState: LocationState; hasResult: boolean }): PanelState | null {

  if (mapLoadState === "missing-key") return { title: "Map unavailable", body: "The live finder is temporarily unavailable. Please try again later." };
  if (mapLoadState === "error") return { title: "Map unavailable", body: "The map could not load. Check your connection and try again." };
  if (mapLoadState === "loading") return { title: "Loading map", body: "Preparing the 6D Address finder." };
  if (locationState === "locating") return { title: "Locating...", body: "Allow location access to calculate your 6D Address code." };
  if (locationState === "denied") return { title: "Location permission denied", body: mapLoadState === "ready" ? "You can still click on the map to choose a location." : "The live map is not available yet." };
  if (locationState === "unavailable" || locationState === "error") return { title: "Location unavailable", body: mapLoadState === "ready" ? "Your browser could not provide a location. You can choose a point on the map manually." : "Your browser could not provide a location and the live map is not available yet." };
  if (hasResult) return null;
  return { title: "Choose a point on the map", body: "Calculate a 6D Address code. A locality is needed to make it a usable address." };
}

function FindInfoPanel({ panelState, pendingCode, result, children }: { panelState: PanelState | null; pendingCode: FormattedCode | null; result: FinderResult | null; children: ReactNode }) {
  const street = result?.landmark ? getLandmarkStreetLine(result.landmark) : undefined;
  if (result?.landmark) return <section className="find-map-page__panel has-result" aria-live="polite" aria-label="6D Address result"><h2 className="find-map-page__landmark-name">{result.landmark.name}</h2><address className="find-map-page__address-lines find-map-page__address-lines--landmark">{street && <span>{street}</span>}<div className="find-map-page__landmark-code-line"><FindCode code={result.code} /><span>{result.landmark.locality}</span></div>{result.landmark.cityLine && <span>{result.landmark.cityLine}</span>}<span>{result.landmark.country}</span></address>{children}</section>;
  return <section className={`find-map-page__panel ${result ? "has-result find-map-page__panel--locality" : ""}`} aria-live="polite" aria-label="6D Address result">
    {result ? <><p className="find-map-page__panel-label">6D Address code</p><FindCode code={result.code} /><div className="find-map-page__locality-prompt"><a className="cta-action cta-action--blue" href="/#contact"><span>Contact us about adding locality information</span><span className="cta-arrow" aria-hidden="true">→</span></a></div></> : pendingCode ? <><p className="find-map-page__panel-label"><NoWrap6D /></p><FindCode code={pendingCode} /><p className="find-map-page__panel-body">Resolving locality information for the selected point.</p></> : <><p className="find-map-page__panel-title">{panelState?.title}</p><p className="find-map-page__panel-body">{panelState?.body ? renderNoWrap6D(panelState.body) : null}</p></>}
    {children}
  </section>;
}

function FindCode({ code }: { code: FormattedCode }) { return <div className="find-map-page__code" aria-label={`${code.c2d}-${code.c4d}-${code.c6d}`}><span className="code-2d">{code.c2d}</span><span className="code-sep">-</span><span className="code-4d">{code.c4d}</span><span className="code-sep">-</span><span className="code-6d">{code.c6d}</span></div>; }
function formatCode(code: string): FormattedCode { const [c2d, c4d, c6d] = code.split("-"); return { c2d, c4d, c6d }; }

function FinderIcon({ kind }: { kind: "copy" | "location" | "share" | "coordinates" }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "copy" ? <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></> : kind === "share" ? <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></> : kind === "location" ? <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></> : <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18m6-18v18M3 9h18M3 15h18" /></>}
  </svg>;
}

function FinderActions({ result, locationState, mapReady, onLocate }: { result: FinderResult | null; locationState: LocationState; mapReady: boolean; onLocate: () => void }) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setFeedback(""); }, [result]);
  useEffect(() => { if (!feedback) return; const timer = window.setTimeout(() => setFeedback(""), 4000); return () => window.clearTimeout(timer); }, [feedback]);
  const perform = async (share: boolean) => {
    if (!result) return;
    const code = `${result.code.c2d}-${result.code.c4d}-${result.code.c6d}`;
    setBusy(true);
    try {
      if (share && navigator.share) {
        await navigator.share({ title: "6D Address", text: result.landmark ? `${result.landmark.name}: ${code}` : `6D Address code: ${code}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(share ? window.location.href : code);
        setFeedback(share ? "Location link copied" : "Code copied");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFeedback(share ? "Could not share. Copy the link from your address bar." : "Could not copy. Please select and copy the code.");
    } finally { setBusy(false); }
  };
  return <div className="finder-panel-actions">
    <div className="finder-action-row" role="group" aria-label="Location actions">
      <button type="button" onClick={() => void perform(false)} disabled={!result || busy} title="Copy code"><FinderIcon kind="copy" /><span>Copy code</span></button>
      <button type="button" onClick={onLocate} disabled={!mapReady || locationState === "locating"} title="Use my location"><FinderIcon kind="location" /><span>{locationState === "locating" ? "Locating..." : "My location"}</span></button>
      <button type="button" onClick={() => void perform(true)} disabled={!result || busy} title="Share location"><FinderIcon kind="share" /><span>Share</span></button>
    </div>
    <p className="finder-action-feedback" role="status">{feedback}</p>
  </div>;
}
