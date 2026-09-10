import type { Reverse6DBounds } from "./reverse6dViewportSearch";

export type GeocoderPlaceType =
  | "poi"
  | "address"
  | "street"
  | "neighbourhood"
  | "locality"
  | "city"
  | "district"
  | "region"
  | "country"
  | "unknown";

export type GeocoderPlace = {
  id: string;
  provider: "geoapify";
  name: string;
  displayName: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  district?: string;
  locality?: string;
  postcode?: string;
  lat: number;
  lng: number;
  bbox?: Reverse6DBounds;
  placeType?: GeocoderPlaceType;
  confidence?: number;
  rawProviderType?: string;
};

export class GeocoderUnavailableError extends Error {
  readonly status?: number;

  constructor(message = "Worldwide place search is temporarily unavailable.", status?: number) {
    super(message);
    this.name = "GeocoderUnavailableError";
    this.status = status;
  }
}

type GeocoderPayload = {
  results?: unknown;
};

const SPECIFIC_PLACE_TYPES = new Set<GeocoderPlaceType>(["poi", "address", "street"]);

export async function geocodePlaces(
  query: string,
  mode: "autocomplete" | "search" = "search",
  limit = 5,
  signal?: AbortSignal,
): Promise<GeocoderPlace[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || (mode === "autocomplete" && normalizedQuery.length < 2)) return [];

  const parameters = new URLSearchParams({
    mode,
    q: normalizedQuery,
    limit: String(Math.max(1, Math.min(8, Math.floor(limit)))),
  });

  let response: Response;
  try {
    response = await fetch(`/.netlify/functions/geocode?${parameters.toString()}`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new GeocoderUnavailableError();
  }

  if (response.status === 400) return [];
  if (!response.ok) throw new GeocoderUnavailableError(undefined, response.status);

  let payload: GeocoderPayload;
  try {
    payload = await response.json() as GeocoderPayload;
  } catch {
    throw new GeocoderUnavailableError();
  }

  if (!Array.isArray(payload.results)) return [];
  return dedupePlaces(payload.results.map(normalizePlace).filter((place): place is GeocoderPlace => place !== null));
}

export function getSearchBoundsForGeocoderPlace(place: GeocoderPlace): Reverse6DBounds | null {
  if (place.placeType === "country" || place.placeType === "region") return null;

  const radiusMetres = getFallbackRadiusMetres(place.placeType);
  const fallbackBounds = boundsAroundCoordinate(place.lat, place.lng, radiusMetres);
  if (!place.bbox || !isValidBounds(place.bbox)) return fallbackBounds;

  // Tiny provider bboxes (for example a building outline) are padded enough to
  // include the centre of the corresponding 6D grid cell.
  const minimumRadiusMetres = SPECIFIC_PLACE_TYPES.has(place.placeType ?? "unknown") ? 80 : 250;
  const minimumBounds = boundsAroundCoordinate(place.lat, place.lng, minimumRadiusMetres);
  return {
    north: Math.max(place.bbox.north, minimumBounds.north),
    south: Math.min(place.bbox.south, minimumBounds.south),
    east: Math.max(place.bbox.east, minimumBounds.east),
    west: Math.min(place.bbox.west, minimumBounds.west),
  };
}

export function isGeocoderPlaceTooBroad(place: GeocoderPlace, bounds: Reverse6DBounds | null): boolean {
  if (!bounds || place.placeType === "country" || place.placeType === "region") return true;

  const latitudeSpan = Math.max(0, bounds.north - bounds.south);
  const longitudeSpan = Math.max(0, bounds.east - bounds.west);
  const area = latitudeSpan * longitudeSpan;

  if (place.placeType === "district") {
    return latitudeSpan > 0.18 || longitudeSpan > 0.25 || area > 0.025;
  }

  return latitudeSpan > 0.25 || longitudeSpan > 0.35 || area > 0.04;
}

export function isSpecificGeocoderPlace(place: GeocoderPlace): boolean {
  return SPECIFIC_PLACE_TYPES.has(place.placeType ?? "unknown");
}

function normalizePlace(value: unknown): GeocoderPlace | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const lat = finiteNumber(source.lat);
  const lng = finiteNumber(source.lng);
  const name = optionalString(source.name);
  const displayName = optionalString(source.displayName) ?? name;
  if (lat === null || lng === null || !name || !displayName) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const rawProviderType = optionalString(source.rawProviderType) ?? optionalString(source.placeType);
  const bbox = normalizeBounds(source.bbox);
  const confidence = finiteNumber(source.confidence);

  return {
    id: optionalString(source.id) ?? `geoapify-${lat}-${lng}-${name}`,
    provider: "geoapify",
    name,
    displayName,
    country: optionalString(source.country),
    countryCode: optionalString(source.countryCode),
    region: optionalString(source.region),
    city: optionalString(source.city),
    district: optionalString(source.district),
    locality: optionalString(source.locality),
    postcode: optionalString(source.postcode),
    lat,
    lng,
    ...(bbox ? { bbox } : {}),
    placeType: mapProviderPlaceType(rawProviderType),
    ...(confidence === null ? {} : { confidence }),
    ...(rawProviderType ? { rawProviderType } : {}),
  };
}

function mapProviderPlaceType(value?: string): GeocoderPlaceType {
  const type = value?.toLocaleLowerCase().replace(/[\s-]+/g, "_") ?? "";
  if (["amenity", "building", "commercial", "leisure", "natural", "poi", "tourism"].includes(type)) return "poi";
  if (["address", "house", "postcode"].includes(type)) return "address";
  if (["highway", "route", "street"].includes(type)) return "street";
  if (["borough", "neighbourhood", "quarter", "suburb"].includes(type)) return "neighbourhood";
  if (["locality", "village"].includes(type)) return "locality";
  if (["city", "municipality", "town"].includes(type)) return "city";
  if (["county", "district"].includes(type)) return "district";
  if (["region", "state"].includes(type)) return "region";
  if (type === "country") return "country";
  return "unknown";
}

function getFallbackRadiusMetres(placeType?: GeocoderPlaceType) {
  if (SPECIFIC_PLACE_TYPES.has(placeType ?? "unknown")) return 600;
  if (placeType === "neighbourhood") return 3_000;
  if (placeType === "locality") return 5_000;
  if (placeType === "city" || placeType === "district") return 7_000;
  return 2_000;
}

function boundsAroundCoordinate(lat: number, lng: number, radiusMetres: number): Reverse6DBounds {
  const latitudeDelta = radiusMetres / 111_320;
  const longitudeScale = Math.max(0.1, Math.cos(lat * Math.PI / 180));
  const longitudeDelta = Math.min(180, radiusMetres / (111_320 * longitudeScale));
  return {
    north: Math.min(90, lat + latitudeDelta),
    south: Math.max(-90, lat - latitudeDelta),
    east: Math.min(180, lng + longitudeDelta),
    west: Math.max(-180, lng - longitudeDelta),
  };
}

function normalizeBounds(value: unknown): Reverse6DBounds | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const north = finiteNumber(source.north);
  const south = finiteNumber(source.south);
  const east = finiteNumber(source.east);
  const west = finiteNumber(source.west);
  if (north === null || south === null || east === null || west === null) return undefined;
  const bounds = { north, south, east, west };
  return isValidBounds(bounds) ? bounds : undefined;
}

function isValidBounds(bounds: Reverse6DBounds) {
  return bounds.south <= bounds.north
    && bounds.west <= bounds.east
    && bounds.south >= -90
    && bounds.north <= 90
    && bounds.west >= -180
    && bounds.east <= 180;
}

function dedupePlaces(places: GeocoderPlace[]) {
  const seenIds = new Set<string>();
  return places.filter((place) => {
    if (seenIds.has(place.id)) return false;
    seenIds.add(place.id);
    return true;
  });
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
