import { FormEvent, KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapLoadingScreen } from "../components/MapLoadingScreen";
import { NoWrap6D, renderNoWrap6D } from "../components/NoWrap6D";
import { Coordinate, generate6DCode } from "../lib/sixd";
import {
  normalize6DCode,
  parseCombinedReverse6DInput,
  searchReverse6DDemoIndex,
  type Reverse6DSearchResult,
} from "../lib/reverse6dSearch";
import {
  findReverse6DCandidatesInBounds,
  type Reverse6DViewportCandidate,
} from "../lib/reverse6dViewportSearch";
import { createGoogleMapsAdapter, MapAdapter, MapAddress, type MapViewport } from "../map/googleMapsAdapter";

const INITIAL_MAP_CENTER: Coordinate = { lat: 51.5074, lng: -0.1278 };
const MAP_LOADER_MINIMUM_MS = 800;
const MAP_LOADER_FADE_MS = 320;
const REVERSE_VIEWPORT_MINIMUM_ZOOM = 14;
const REVERSE_VIEWPORT_MAX_CANDIDATES = 50;
const REVERSE_VIEWPORT_MAX_UNNAMED_RESULTS = 12;
const REVERSE_VIEWPORT_MAX_LATITUDE_SPAN = 0.2;
const REVERSE_VIEWPORT_MAX_LONGITUDE_SPAN = 0.3;
const REVERSE_VIEWPORT_MAX_AREA = 0.04;

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

type InitialReverseSearch = {
  codeInput: string;
  place: string;
};

function parseUrlCoordinate(params: URLSearchParams): Coordinate | null {
  if (!params.has("lat") || !params.has("lng")) return null;

  const latValue = params.get("lat");
  const lngValue = params.get("lng");

  if (!latValue || !lngValue) return null;

  const lat = Number(latValue);
  const lng = Number(lngValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function getInitialReverseSearch(params: URLSearchParams): InitialReverseSearch | null {
  if (parseUrlCoordinate(params) || params.get("locate") === "1") return null;

  if (params.has("code")) {
    const rawCode = params.get("code")?.trim() ?? "";
    return {
      codeInput: normalize6DCode(rawCode) ?? rawCode,
      place: params.get("place")?.trim() ?? "",
    };
  }

  if (params.has("q")) {
    const rawQuery = params.get("q")?.trim() ?? "";
    const parsed = parseCombinedReverse6DInput(rawQuery);
    return parsed.code
      ? { codeInput: parsed.code, place: parsed.place }
      : { codeInput: rawQuery, place: "" };
  }

  return null;
}

function replaceFindUrl({
  code,
  place,
  coordinate,
}: {
  code?: string;
  place?: string;
  coordinate?: Coordinate;
} = {}) {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (place) params.set("place", place);
  if (coordinate) {
    params.set("lat", String(coordinate.lat));
    params.set("lng", String(coordinate.lng));
  }
  const query = params.toString().replace(/\+/g, "%20");
  window.history.replaceState(window.history.state, "", `/find${query ? `?${query}` : ""}`);
}

function viewportIsTooBroad(viewport: MapViewport) {
  const latitudeSpan = Math.max(0, viewport.bounds.north - viewport.bounds.south);
  const longitudeSpan = viewport.bounds.west <= viewport.bounds.east
    ? viewport.bounds.east - viewport.bounds.west
    : 360 - viewport.bounds.west + viewport.bounds.east;

  return latitudeSpan > REVERSE_VIEWPORT_MAX_LATITUDE_SPAN
    || longitudeSpan > REVERSE_VIEWPORT_MAX_LONGITUDE_SPAN
    || latitudeSpan * longitudeSpan > REVERSE_VIEWPORT_MAX_AREA;
}

export default function FindPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const adapter = useRef<MapAdapter | null>(null);
  const requestedInitialActionRef = useRef(false);
  const latestCode = useRef<FormattedCode | null>(null);
  const latestSuffix = useRef("");
  const loaderStartedAt = useRef(performance.now());
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [showMapLoader, setShowMapLoader] = useState(true);
  const [mapLoaderExiting, setMapLoaderExiting] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [result, setResult] = useState<FinderResult | null>(null);
  const [pendingCode, setPendingCode] = useState<FormattedCode | null>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const autoLocate = useMemo(() => initialParams.get("locate") === "1", [initialParams]);
  const initialReverseSearch = useMemo(() => getInitialReverseSearch(initialParams), [initialParams]);

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
        setSelectionRevision((current) => current + 1);
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
      onViewportChange: (nextViewport) => {
        if (!cancelled) setViewport(nextViewport);
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
    if (mapLoadState === "loading") return;

    const elapsed = performance.now() - loaderStartedAt.current;
    const remaining = Math.max(0, MAP_LOADER_MINIMUM_MS - elapsed);
    let hideTimer = 0;
    const exitTimer = window.setTimeout(() => {
      setMapLoaderExiting(true);
      hideTimer = window.setTimeout(() => setShowMapLoader(false), MAP_LOADER_FADE_MS);
    }, remaining);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [mapLoadState]);

  useEffect(() => {
    if (mapLoadState !== "ready") return;
    if (requestedInitialActionRef.current || !adapter.current) return;

    const coordinate = parseUrlCoordinate(initialParams);

    if (!coordinate) return;

    requestedInitialActionRef.current = true;
    setLocationState("idle");
    adapter.current.setPin(coordinate, 18);
  }, [initialParams, mapLoadState]);

  useEffect(() => {
    if (mapLoadState !== "ready") return;
    if (requestedInitialActionRef.current || !autoLocate) return;

    requestedInitialActionRef.current = true;
    handleLocate();
  }, [autoLocate, handleLocate, mapLoadState]);

  const panelState = getFinderPanelState({
    mapLoadState,
    locationState,
    hasResult: Boolean(result),
  });

  const selectReverseCoordinate = useCallback((coordinate: Coordinate) => {
    if (mapLoadState !== "ready" || !adapter.current) return false;
    setLocationState("idle");
    adapter.current.setPin(coordinate, 17);
    return true;
  }, [mapLoadState]);

  const showReverseSearchPreview = useCallback((candidates: Reverse6DViewportCandidate[]) => {
    adapter.current?.showReverseSearchPreview(candidates.map(({ id, lat, lng, label }) => ({ id, lat, lng, label })));
  }, []);

  const clearReverseSearchPreview = useCallback(() => {
    adapter.current?.clearReverseSearchPreview();
  }, []);

  const setReverseSearchPreviewActive = useCallback((id: string | null) => {
    adapter.current?.setReverseSearchPreviewActive(id);
  }, []);

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

      {showMapLoader && <MapLoadingScreen isExiting={mapLoaderExiting} />}

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

      <ReverseSearchPanel
        getViewport={() => adapter.current?.getViewport() ?? null}
        initialSearch={initialReverseSearch}
        isMapReady={mapLoadState === "ready"}
        onClearPreview={clearReverseSearchPreview}
        onPreviewActive={setReverseSearchPreviewActive}
        onSelect={selectReverseCoordinate}
        onShowPreview={showReverseSearchPreview}
        selectionRevision={selectionRevision}
        viewport={viewport}
      />

      <FindInfoPanel panelState={panelState} pendingCode={pendingCode} result={result} />
    </main>
  );
}

function ReverseSearchPanel({
  getViewport,
  initialSearch,
  isMapReady,
  onClearPreview,
  onPreviewActive,
  onSelect,
  onShowPreview,
  selectionRevision,
  viewport,
}: {
  getViewport: () => MapViewport | null;
  initialSearch: InitialReverseSearch | null;
  isMapReady: boolean;
  onClearPreview: () => void;
  onPreviewActive: (id: string | null) => void;
  onSelect: (coordinate: Coordinate) => boolean;
  onShowPreview: (candidates: Reverse6DViewportCandidate[]) => void;
  selectionRevision: number;
  viewport: MapViewport | null;
}) {
  const listboxId = useId();
  const viewportListId = useId();
  const initialSearchHandledRef = useRef(false);
  const [codeInput, setCodeInput] = useState(() => initialSearch?.codeInput ?? "");
  const [query, setQuery] = useState(() => initialSearch?.place ?? "");
  const [message, setMessage] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [viewportCandidates, setViewportCandidates] = useState<Reverse6DViewportCandidate[]>([]);
  const normalizedCode = normalize6DCode(codeInput);
  const suggestions = useMemo(
    () => normalizedCode && query.trim() ? searchReverse6DDemoIndex(normalizedCode, query) : [],
    [normalizedCode, query],
  );

  const closeSuggestions = () => {
    setSuggestionsOpen(false);
    setHighlightedIndex(-1);
  };

  const clearViewportCandidates = () => {
    setViewportCandidates([]);
    onPreviewActive(null);
    onClearPreview();
  };

  useEffect(() => {
    setViewportCandidates([]);
    onPreviewActive(null);
    onClearPreview();
  }, [onClearPreview, onPreviewActive, selectionRevision]);

  const applyCodeInput = (value: string) => {
    const parsed = parseCombinedReverse6DInput(value);
    setCodeInput(parsed.code ?? value);
    if (parsed.code && parsed.place) {
      setQuery(parsed.place);
      setSuggestionsOpen(true);
      setHighlightedIndex(-1);
    } else {
      closeSuggestions();
    }
    setMessage("");
    clearViewportCandidates();
  };

  const applyQueryInput = (value: string) => {
    const parsed = parseCombinedReverse6DInput(value);
    if (parsed.code && parsed.place) {
      setCodeInput(parsed.code);
      setQuery(parsed.place);
    } else {
      setQuery(value);
    }
    setMessage("");
    setSuggestionsOpen(true);
    setHighlightedIndex(-1);
    clearViewportCandidates();
  };

  const selectSuggestion = (suggestion: Reverse6DSearchResult, updateUrl = true) => {
    if (!onSelect({ lat: suggestion.place.lat, lng: suggestion.place.lng })) {
      setMessage("The map is still loading. Try again in a moment.");
      return;
    }
    setQuery(suggestion.place.name);
    setMessage("");
    closeSuggestions();
    clearViewportCandidates();
    if (updateUrl) replaceFindUrl({ code: suggestion.code, place: suggestion.place.name });
  };

  const selectViewportCandidate = (candidate: Reverse6DViewportCandidate) => {
    if (!onSelect({ lat: candidate.lat, lng: candidate.lng })) {
      setMessage("Map is still loading. Try again in a moment.");
      return;
    }

    if (candidate.matchedDemoPlace) setQuery(candidate.matchedDemoPlace.name);
    setMessage("");
    closeSuggestions();
    clearViewportCandidates();
    replaceFindUrl({ code: candidate.code, coordinate: { lat: candidate.lat, lng: candidate.lng } });
  };

  const runSearch = (updateUrl = true) => {
    if (!normalizedCode) {
      setMessage("Enter a valid 6D code, for example 35-12-12.");
      closeSuggestions();
      clearViewportCandidates();
      return;
    }
    setCodeInput(normalizedCode);
    if (updateUrl) replaceFindUrl({ code: normalizedCode, place: query.trim() || undefined });

    if (!query.trim()) {
      setMessage("A 6D code is not a complete address on its own. Add a locality, city or country, or search within the current map view.");
      closeSuggestions();
      clearViewportCandidates();
      return;
    }
    if (!suggestions.length) {
      setMessage("No matching demo location found. Add more place detail or search within the current map view.");
      closeSuggestions();
      clearViewportCandidates();
      return;
    }

    const highConfidenceResults = suggestions.filter((result) => result.confidence === "high");
    if (suggestions.length === 1 && highConfidenceResults.length === 1) {
      selectSuggestion(suggestions[0], updateUrl);
      return;
    }

    setMessage(suggestions.length > 1
      ? "This 6D code appears more than once in this area. Please choose the locality."
      : "");
    setSuggestionsOpen(true);
    setHighlightedIndex(0);
    clearViewportCandidates();
  };

  const runViewportSearch = () => {
    closeSuggestions();
    clearViewportCandidates();

    if (!normalizedCode) {
      setMessage("Enter a valid 6D code, for example 35-12-12.");
      return;
    }
    setCodeInput(normalizedCode);

    if (!isMapReady) {
      setMessage("Map is still loading. Try again in a moment.");
      return;
    }

    const currentViewport = getViewport();
    if (!currentViewport) {
      setMessage("Map is still loading. Try again in a moment.");
      return;
    }

    if (currentViewport.zoom < REVERSE_VIEWPORT_MINIMUM_ZOOM || viewportIsTooBroad(currentViewport)) {
      setMessage("Zoom in further or add a locality, city or country. A 6D code is not a complete address on its own.");
      return;
    }

    const searchResult = findReverse6DCandidatesInBounds({
      code: normalizedCode,
      bounds: currentViewport.bounds,
      maxCandidates: REVERSE_VIEWPORT_MAX_CANDIDATES,
    });

    if (searchResult.exceededLimit) {
      setMessage("Too many matching 6D cells were found in this view. Zoom in further or add a locality, city or country.");
      return;
    }
    if (searchResult.candidates.length === 0) {
      setMessage("No matching 6D cells found in the current map view.");
      return;
    }
    if (searchResult.candidates.length === 1) {
      selectViewportCandidate(searchResult.candidates[0]);
      return;
    }

    if (searchResult.candidates.filter((candidate) => !candidate.matchedDemoPlace).length > REVERSE_VIEWPORT_MAX_UNNAMED_RESULTS) {
      setMessage("Too many matching 6D cells were found in this view. Zoom in further or add a locality, city or country.");
      return;
    }

    setViewportCandidates(searchResult.candidates);
    onShowPreview(searchResult.candidates);
    setMessage("This 6D code appears more than once in the current map view. Choose a matching cell or zoom in further.");
  };

  useEffect(() => {
    if (!initialSearch || !isMapReady || initialSearchHandledRef.current) return;
    initialSearchHandledRef.current = true;
    runSearch(false);
  }, [initialSearch, isMapReady]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    initialSearchHandledRef.current = true;
    if (suggestionsOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      selectSuggestion(suggestions[highlightedIndex]);
      return;
    }
    runSearch();
  };

  const onQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setHighlightedIndex((current) => Math.min(current + 1, suggestions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    }
  };

  const resetSearch = () => {
    initialSearchHandledRef.current = true;
    setCodeInput("");
    setQuery("");
    setMessage("");
    closeSuggestions();
    clearViewportCandidates();
    replaceFindUrl();
  };

  const showSuggestions = suggestionsOpen && suggestions.length > 0;
  const canSearchViewport = Boolean(
    normalizedCode
      && isMapReady
      && viewport
      && viewport.zoom >= REVERSE_VIEWPORT_MINIMUM_ZOOM
      && !viewportIsTooBroad(viewport),
  );
  const viewportButtonTitle = !normalizedCode
    ? "Enter a valid 6D code"
    : !isMapReady || !viewport
      ? "Map is still loading"
      : viewport.zoom < REVERSE_VIEWPORT_MINIMUM_ZOOM || viewportIsTooBroad(viewport)
        ? "Zoom in to search the current map view"
        : "Search matching cells in the current map view";

  return (
    <aside className="find-reverse-search" aria-label="Find by 6D Address">
      <form onSubmit={onSubmit}>
        <h1>Find by 6D Address</h1>
        <div className="find-reverse-search__fields">
          <label className="find-reverse-search__code-field">
            <span>6D code</span>
            <input
              inputMode="numeric"
              onBlur={() => normalizedCode && setCodeInput(normalizedCode)}
              onChange={(event) => {
                initialSearchHandledRef.current = true;
                applyCodeInput(event.target.value);
              }}
              placeholder="35-12-12"
              value={codeInput}
            />
          </label>
          <label className="find-reverse-search__query-field">
            <span>Locality, city or country</span>
            <input
              aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-${highlightedIndex}` : undefined}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={showSuggestions}
              autoComplete="off"
              onChange={(event) => {
                initialSearchHandledRef.current = true;
                applyQueryInput(event.target.value);
              }}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              onKeyDown={onQueryKeyDown}
              placeholder="London, Bosaso, Eiffel Tower"
              role="combobox"
              value={query}
            />
            {showSuggestions && (
              <div className="find-reverse-search__suggestions" id={listboxId} role="listbox">
                {suggestions.map((suggestion, index) => (
                  <button
                    aria-selected={highlightedIndex === index}
                    className={highlightedIndex === index ? "is-highlighted" : ""}
                    id={`${listboxId}-${index}`}
                    key={suggestion.place.id}
                    onClick={() => selectSuggestion(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className="find-reverse-search__suggestion-copy">
                      <strong>{suggestion.place.name}</strong>
                      <small>{[suggestion.place.city, suggestion.place.admin1, suggestion.place.country].filter(Boolean).join(", ")}</small>
                      {suggestion.didYouMean && <em>Did you mean {suggestion.place.displayName}?</em>}
                    </span>
                    <span className="find-reverse-search__code-badge">{suggestion.code}</span>
                  </button>
                ))}
              </div>
            )}
          </label>
        </div>
        <div className="find-reverse-search__actions">
          <button className="find-reverse-search__search-button" type="submit">Search</button>
          <button
            aria-disabled={!canSearchViewport}
            onClick={() => {
              initialSearchHandledRef.current = true;
              runViewportSearch();
            }}
            title={viewportButtonTitle}
            type="button"
          >
            Search current map view
          </button>
          <button
            className="find-reverse-search__reset-button"
            disabled={!codeInput && !query && !message && viewportCandidates.length === 0}
            onClick={resetSearch}
            type="button"
          >
            Clear
          </button>
        </div>
        {message && <p className="find-reverse-search__message" role="status">{message}</p>}
        {viewportCandidates.length > 1 && (
          <section className="find-reverse-search__viewport-results" aria-labelledby={`${viewportListId}-heading`}>
            <h2 id={`${viewportListId}-heading`}>Matching 6D cells in this map view</h2>
            <div className="find-reverse-search__viewport-list" id={viewportListId}>
              {viewportCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onBlur={() => onPreviewActive(null)}
                  onClick={() => selectViewportCandidate(candidate)}
                  onFocus={() => onPreviewActive(candidate.id)}
                  onMouseEnter={() => onPreviewActive(candidate.id)}
                  onMouseLeave={() => onPreviewActive(null)}
                  type="button"
                >
                  <span className="find-reverse-search__suggestion-copy">
                    <strong>{candidate.label}</strong>
                    <small>{candidate.lat.toFixed(5)}, {candidate.lng.toFixed(5)}</small>
                  </span>
                  <span className="find-reverse-search__code-badge">{candidate.code}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </form>
    </aside>
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
          <p className="find-map-page__panel-label"><NoWrap6D /></p>
          <FindCode code={result.code} />
          <address className="find-map-page__address-lines">
            <span>{result.address.line1}</span>
            {result.address.line2 && <span>{result.address.line2}</span>}
            {result.address.line3 && <span>{result.address.line3}</span>}
          </address>
        </>
      ) : pendingCode ? (
        <>
          <p className="find-map-page__panel-label"><NoWrap6D /></p>
          <FindCode code={pendingCode} />
          <p className="find-map-page__panel-body">Resolving locality information for the selected point.</p>
        </>
      ) : (
        <>
          <p className="find-map-page__panel-title">{panelState?.title}</p>
          <p className="find-map-page__panel-body">{panelState?.body ? renderNoWrap6D(panelState.body) : null}</p>
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
