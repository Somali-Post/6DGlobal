import { FormEvent, KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapLoadingScreen } from "../components/MapLoadingScreen";
import { NoWrap6D, renderNoWrap6D } from "../components/NoWrap6D";
import { Coordinate, generate6DCode } from "../lib/sixd";
import {
  geocodePlaces,
  getSearchBoundsForGeocoderPlace,
  isGeocoderPlaceTooBroad,
  type GeocoderPlace,
} from "../lib/geocoderClient";
import {
  normalize6DCode,
  normalizeSearchText,
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
const PROVIDER_AUTOCOMPLETE_DEBOUNCE_MS = 320;
const PROVIDER_RESULT_LIMIT = 6;

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

type ProviderSearchState = "idle" | "loading" | "ready" | "unavailable";

type SearchSuggestion =
  | { kind: "local"; result: Reverse6DSearchResult }
  | { kind: "provider"; place: GeocoderPlace };

type CandidateContext =
  | { kind: "viewport" }
  | { kind: "provider"; place: GeocoderPlace };

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
  const providerRequestRef = useRef<AbortController | null>(null);
  const providerAutocompleteTimerRef = useRef<number | null>(null);
  const providerRequestSequenceRef = useRef(0);
  const skipProviderAutocompleteQueryRef = useRef<string | null>(null);
  const [codeInput, setCodeInput] = useState(() => initialSearch?.codeInput ?? "");
  const [query, setQuery] = useState(() => initialSearch?.place ?? "");
  const [message, setMessage] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [viewportCandidates, setViewportCandidates] = useState<Reverse6DViewportCandidate[]>([]);
  const [candidateContext, setCandidateContext] = useState<CandidateContext | null>(null);
  const [providerPlaces, setProviderPlaces] = useState<GeocoderPlace[]>([]);
  const [providerSearchState, setProviderSearchState] = useState<ProviderSearchState>("idle");
  const normalizedCode = normalize6DCode(codeInput);
  const localSuggestions = useMemo(
    () => normalizedCode && query.trim() ? searchReverse6DDemoIndex(normalizedCode, query) : [],
    [normalizedCode, query],
  );
  const visibleProviderPlaces = useMemo(
    () => dedupeProviderPlaces(providerPlaces, localSuggestions),
    [localSuggestions, providerPlaces],
  );
  const suggestions = useMemo<SearchSuggestion[]>(
    () => [
      ...localSuggestions.map((result): SearchSuggestion => ({ kind: "local", result })),
      ...visibleProviderPlaces.map((place): SearchSuggestion => ({ kind: "provider", place })),
    ],
    [localSuggestions, visibleProviderPlaces],
  );

  const closeSuggestions = () => {
    setSuggestionsOpen(false);
    setHighlightedIndex(-1);
  };

  const clearViewportCandidates = () => {
    setViewportCandidates([]);
    setCandidateContext(null);
    onPreviewActive(null);
    onClearPreview();
  };

  const cancelProviderRequest = () => {
    providerRequestSequenceRef.current += 1;
    if (providerAutocompleteTimerRef.current !== null) {
      window.clearTimeout(providerAutocompleteTimerRef.current);
      providerAutocompleteTimerRef.current = null;
    }
    providerRequestRef.current?.abort();
    providerRequestRef.current = null;
  };

  useEffect(() => {
    setViewportCandidates([]);
    setCandidateContext(null);
    onPreviewActive(null);
    onClearPreview();
  }, [onClearPreview, onPreviewActive, selectionRevision]);

  useEffect(() => {
    const providerQuery = query.trim();
    if (skipProviderAutocompleteQueryRef.current === providerQuery) {
      skipProviderAutocompleteQueryRef.current = null;
      return;
    }
    if (!normalizedCode || providerQuery.length < 2) {
      cancelProviderRequest();
      setProviderPlaces([]);
      setProviderSearchState("idle");
      return;
    }

    const sequence = ++providerRequestSequenceRef.current;
    let controller: AbortController | null = null;
    setProviderPlaces([]);
    setProviderSearchState("idle");

    const timer = window.setTimeout(async () => {
      if (providerRequestSequenceRef.current !== sequence) return;
      providerAutocompleteTimerRef.current = null;
      controller = new AbortController();
      providerRequestRef.current?.abort();
      providerRequestRef.current = controller;
      setProviderSearchState("loading");

      try {
        const places = await geocodePlaces(providerQuery, "autocomplete", PROVIDER_RESULT_LIMIT, controller.signal);
        if (providerRequestSequenceRef.current !== sequence) return;
        setProviderPlaces(places);
        setProviderSearchState("ready");
      } catch (error) {
        if (isAbortError(error) || providerRequestSequenceRef.current !== sequence) return;
        setProviderPlaces([]);
        setProviderSearchState("unavailable");
      } finally {
        if (providerRequestRef.current === controller) providerRequestRef.current = null;
      }
    }, PROVIDER_AUTOCOMPLETE_DEBOUNCE_MS);
    providerAutocompleteTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (providerAutocompleteTimerRef.current === timer) providerAutocompleteTimerRef.current = null;
      controller?.abort();
    };
  }, [normalizedCode, query]);

  useEffect(() => () => cancelProviderRequest(), []);

  const applyCodeInput = (value: string) => {
    skipProviderAutocompleteQueryRef.current = null;
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
    skipProviderAutocompleteQueryRef.current = null;
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
    cancelProviderRequest();
    if (!onSelect({ lat: suggestion.place.lat, lng: suggestion.place.lng })) {
      setMessage("The map is still loading. Try again in a moment.");
      return;
    }
    skipProviderAutocompleteQueryRef.current = suggestion.place.name;
    setQuery(suggestion.place.name);
    setMessage("");
    closeSuggestions();
    clearViewportCandidates();
    if (updateUrl) replaceFindUrl({ code: suggestion.code, place: suggestion.place.name });
  };

  const selectViewportCandidate = (
    candidate: Reverse6DViewportCandidate,
    providerPlace = candidateContext?.kind === "provider" ? candidateContext.place : undefined,
  ) => {
    if (!onSelect({ lat: candidate.lat, lng: candidate.lng })) {
      setMessage("Map is still loading. Try again in a moment.");
      return;
    }

    const selectedPlaceName = providerPlace?.name ?? candidate.matchedDemoPlace?.name;
    if (selectedPlaceName) {
      skipProviderAutocompleteQueryRef.current = selectedPlaceName;
      setQuery(selectedPlaceName);
    }
    setMessage("");
    closeSuggestions();
    clearViewportCandidates();
    replaceFindUrl({
      code: candidate.code,
      place: selectedPlaceName,
      coordinate: { lat: candidate.lat, lng: candidate.lng },
    });
  };

  const requestProviderPlaces = async (providerQuery: string, mode: "autocomplete" | "search") => {
    cancelProviderRequest();
    const sequence = providerRequestSequenceRef.current;
    const controller = new AbortController();
    providerRequestRef.current = controller;
    setProviderSearchState("loading");

    try {
      const places = await geocodePlaces(providerQuery, mode, PROVIDER_RESULT_LIMIT, controller.signal);
      if (providerRequestSequenceRef.current !== sequence) return "stale" as const;
      setProviderPlaces(places);
      setProviderSearchState("ready");
      return places;
    } catch (error) {
      if (isAbortError(error) || providerRequestSequenceRef.current !== sequence) return "stale" as const;
      setProviderPlaces([]);
      setProviderSearchState("unavailable");
      return "unavailable" as const;
    } finally {
      if (providerRequestRef.current === controller) providerRequestRef.current = null;
    }
  };

  const selectProviderPlace = (place: GeocoderPlace, updateUrl = true) => {
    const requestedCode = normalize6DCode(codeInput);
    if (!requestedCode) {
      setMessage("Enter a valid 6D code, for example 35-12-12.");
      return;
    }

    skipProviderAutocompleteQueryRef.current = place.name;
    setQuery(place.name);
    if (updateUrl) replaceFindUrl({ code: requestedCode, place: place.name });

    const bounds = getSearchBoundsForGeocoderPlace(place);
    clearViewportCandidates();
    if (isGeocoderPlaceTooBroad(place, bounds)) {
      setMessage("This place is too broad for a reliable reverse 6D search. Add a more specific locality, neighbourhood or landmark.");
      setSuggestionsOpen(true);
      setHighlightedIndex(-1);
      return;
    }

    const searchResult = findReverse6DCandidatesInBounds({
      code: requestedCode,
      bounds: bounds!,
      maxCandidates: REVERSE_VIEWPORT_MAX_CANDIDATES,
    });

    if (searchResult.exceededLimit) {
      setMessage("Too many matching 6D cells were found in this area. Add a more specific locality, neighbourhood or landmark.");
      closeSuggestions();
      return;
    }
    if (searchResult.candidates.length === 0) {
      setMessage("The place was found, but this 6D code was not found inside its area. Check the code or choose a more specific locality.");
      closeSuggestions();
      return;
    }
    const providerNeedsExplicitCellChoice = place.placeType === "city" || place.placeType === "district";
    if (searchResult.candidates.length === 1 && !providerNeedsExplicitCellChoice) {
      selectViewportCandidate(searchResult.candidates[0], place);
      return;
    }
    if (searchResult.candidates.filter((candidate) => !candidate.matchedDemoPlace).length > REVERSE_VIEWPORT_MAX_UNNAMED_RESULTS) {
      setMessage("Too many matching 6D cells were found in this area. Add a more specific locality, neighbourhood or landmark.");
      closeSuggestions();
      return;
    }

    setViewportCandidates(searchResult.candidates);
    setCandidateContext({ kind: "provider", place });
    onShowPreview(searchResult.candidates);
    setMessage(searchResult.candidates.length === 1
      ? "Choose the matching 6D cell for this place."
      : "This 6D code appears more than once in this area. Choose a matching cell or narrow the place.");
    closeSuggestions();
  };

  const chooseSuggestion = (suggestion: SearchSuggestion, updateUrl = true) => {
    if (suggestion.kind === "local") {
      selectSuggestion(suggestion.result, updateUrl);
      return;
    }
    selectProviderPlace(suggestion.place, updateUrl);
  };

  const runSearch = async (updateUrl = true) => {
    if (!normalizedCode) {
      setMessage("Enter a valid 6D code, for example 35-12-12.");
      closeSuggestions();
      clearViewportCandidates();
      return;
    }
    setCodeInput(normalizedCode);
    if (updateUrl) replaceFindUrl({ code: normalizedCode, place: query.trim() || undefined });

    if (!query.trim()) {
      cancelProviderRequest();
      setProviderPlaces([]);
      setProviderSearchState("idle");
      setMessage("A 6D code is not a complete address on its own. Add a locality, city or country, or search within the current map view.");
      closeSuggestions();
      clearViewportCandidates();
      return;
    }

    const highConfidenceResults = localSuggestions.filter((result) => result.confidence === "high");
    if (highConfidenceResults.length === 1) {
      selectSuggestion(highConfidenceResults[0], updateUrl);
      return;
    }

    if (localSuggestions.length) {
      setMessage("This 6D code appears more than once in this area. Choose a matching cell or narrow the place.");
      setSuggestionsOpen(true);
      setHighlightedIndex(0);
      clearViewportCandidates();
    } else {
      setMessage("");
      setSuggestionsOpen(true);
      setHighlightedIndex(-1);
      clearViewportCandidates();
    }

    const places = await requestProviderPlaces(query.trim(), "search");
    if (places === "stale") return;
    if (places === "unavailable") {
      if (localSuggestions.length) {
        setMessage("This 6D code appears more than once in this area. Choose a matching locality or narrow the place.");
        setSuggestionsOpen(true);
        setHighlightedIndex(0);
      } else {
        setMessage("Worldwide place search is temporarily unavailable.");
        closeSuggestions();
      }
      clearViewportCandidates();
      return;
    }

    const dedupedPlaces = dedupeProviderPlaces(places, localSuggestions);
    if (localSuggestions.length) {
      setMessage(localSuggestions.length > 1
        ? "This 6D code appears more than once in this area. Choose a matching cell or narrow the place."
        : "Choose the matching locality or a worldwide place result.");
      setSuggestionsOpen(true);
      setHighlightedIndex(0);
      clearViewportCandidates();
      return;
    }
    if (dedupedPlaces.length === 0) {
      setMessage("No matching place found. Try another spelling or add city or country detail.");
      setSuggestionsOpen(true);
      setHighlightedIndex(-1);
      clearViewportCandidates();
      return;
    }
    if (dedupedPlaces.length === 1) {
      selectProviderPlace(dedupedPlaces[0], updateUrl);
      return;
    }

    setMessage("Choose a worldwide place result to search for matching 6D cells in its area.");
    setSuggestionsOpen(true);
    setHighlightedIndex(0);
    clearViewportCandidates();
  };

  const runViewportSearch = () => {
    cancelProviderRequest();
    setProviderSearchState("idle");
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
    setCandidateContext({ kind: "viewport" });
    onShowPreview(searchResult.candidates);
    setMessage("This 6D code appears more than once in the current map view. Choose a matching cell or zoom in further.");
  };

  useEffect(() => {
    if (!initialSearch || !isMapReady || initialSearchHandledRef.current) return;
    initialSearchHandledRef.current = true;
    void runSearch(false);
  }, [initialSearch, isMapReady]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    initialSearchHandledRef.current = true;
    if (suggestionsOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      chooseSuggestion(suggestions[highlightedIndex]);
      return;
    }
    void runSearch();
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
    cancelProviderRequest();
    setCodeInput("");
    setQuery("");
    setMessage("");
    closeSuggestions();
    clearViewportCandidates();
    setProviderPlaces([]);
    setProviderSearchState("idle");
    replaceFindUrl();
  };

  const showProviderStatus = Boolean(normalizedCode && query.trim().length >= 2);
  const showSuggestions = suggestionsOpen && (suggestions.length > 0 || showProviderStatus);
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
              onFocus={() => (suggestions.length > 0 || showProviderStatus) && setSuggestionsOpen(true)}
              onKeyDown={onQueryKeyDown}
              placeholder="London, Bosaso, Eiffel Tower"
              role="combobox"
              value={query}
            />
            {showSuggestions && (
              <div className="find-reverse-search__suggestions" id={listboxId} role="listbox">
                {suggestions.map((suggestion, index) => {
                  const key = suggestion.kind === "local" ? `local-${suggestion.result.place.id}` : `provider-${suggestion.place.id}`;
                  return (
                    <button
                      aria-selected={highlightedIndex === index}
                      className={`${highlightedIndex === index ? "is-highlighted " : ""}${suggestion.kind === "provider" ? "is-provider" : ""}`.trim()}
                      id={`${listboxId}-${index}`}
                      key={key}
                      onClick={() => chooseSuggestion(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      role="option"
                      type="button"
                    >
                      {suggestion.kind === "local" ? (
                        <>
                          <span className="find-reverse-search__suggestion-copy">
                            <strong>{suggestion.result.place.name}</strong>
                            <small>{[suggestion.result.place.city, suggestion.result.place.admin1, suggestion.result.place.country].filter(Boolean).join(", ")}</small>
                            {suggestion.result.didYouMean && <em>Did you mean {suggestion.result.place.displayName}?</em>}
                          </span>
                          <span className="find-reverse-search__code-badge">{suggestion.result.code}</span>
                        </>
                      ) : (
                        <>
                          <span className="find-reverse-search__suggestion-copy">
                            <strong>{suggestion.place.name}</strong>
                            <small>{getProviderSecondaryLabel(suggestion.place)}</small>
                            <em>Worldwide place result</em>
                          </span>
                          <span className="find-reverse-search__provider-badge">Worldwide</span>
                        </>
                      )}
                    </button>
                  );
                })}
                {providerSearchState === "loading" && (
                  <p className="find-reverse-search__provider-status" role="status">Searching worldwide place data…</p>
                )}
                {providerSearchState === "unavailable" && (
                  <p className="find-reverse-search__provider-status is-error" role="status">Worldwide place search is temporarily unavailable.</p>
                )}
                {providerSearchState === "ready" && visibleProviderPlaces.length === 0 && localSuggestions.length === 0 && (
                  <p className="find-reverse-search__provider-status" role="status">No matching place found. Try another spelling or add city or country detail.</p>
                )}
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
        {viewportCandidates.length > 0 && candidateContext && (
          <section className="find-reverse-search__viewport-results" aria-labelledby={`${viewportListId}-heading`}>
            <h2 id={`${viewportListId}-heading`}>
              {candidateContext.kind === "provider"
                ? `Matching 6D cells in ${candidateContext.place?.name ?? "this area"}`
                : "Matching 6D cells in this map view"}
            </h2>
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

function dedupeProviderPlaces(
  places: GeocoderPlace[],
  localResults: Reverse6DSearchResult[],
): GeocoderPlace[] {
  const seenProviderPlaces: GeocoderPlace[] = [];

  return places.filter((place) => {
    const providerName = normalizeSearchText(place.name);
    const duplicatesLocalResult = localResults.some(({ place: localPlace }) => {
      const localNames = [localPlace.name, localPlace.displayName, ...localPlace.aliases].map(normalizeSearchText);
      return localNames.includes(providerName)
        && coordinatesAreNear(place.lat, place.lng, localPlace.lat, localPlace.lng);
    });
    if (duplicatesLocalResult) return false;

    const duplicatesProviderResult = seenProviderPlaces.some((seenPlace) =>
      normalizeSearchText(seenPlace.name) === providerName
      && coordinatesAreNear(place.lat, place.lng, seenPlace.lat, seenPlace.lng)
    );
    if (duplicatesProviderResult) return false;

    seenProviderPlaces.push(place);
    return true;
  });
}

function coordinatesAreNear(firstLat: number, firstLng: number, secondLat: number, secondLng: number) {
  const latitudeDifference = Math.abs(firstLat - secondLat);
  const longitudeDifference = Math.abs(firstLng - secondLng)
    * Math.max(0.1, Math.cos(((firstLat + secondLat) / 2) * Math.PI / 180));
  return latitudeDifference <= 0.0015 && longitudeDifference <= 0.0015;
}

function getProviderSecondaryLabel(place: GeocoderPlace) {
  const normalizedName = normalizeSearchText(place.name);
  const parts = [place.locality, place.district, place.city, place.region, place.country]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, allParts) =>
      normalizeSearchText(part) !== normalizedName
      && allParts.findIndex((candidate) => normalizeSearchText(candidate) === normalizeSearchText(part)) === index
    );
  return parts.join(", ") || place.displayName;
}

function isAbortError(error: unknown) {
  return (error instanceof DOMException || error instanceof Error) && error.name === "AbortError";
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
