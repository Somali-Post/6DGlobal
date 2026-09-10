import type { Handler, HandlerResponse } from "@netlify/functions";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 8;
const REQUEST_TIMEOUT_MS = 7_000;
const SUCCESS_CACHE_CONTROL = "public, max-age=3600";

type GeocoderMode = "autocomplete" | "search";

type NormalizedGeocoderResult = {
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
  bbox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  placeType?: string;
  confidence?: number;
  rawProviderType?: string;
};

type GeoapifyFeature = {
  properties?: Record<string, unknown>;
  bbox?: unknown;
};

function jsonResponse(body: unknown, statusCode: number, cacheControl?: string): HandlerResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(cacheControl ? { "Cache-Control": cacheControl } : { "Cache-Control": "no-store" }),
    },
    body: JSON.stringify(body),
  };
}

function getQueryParameters(event: Parameters<Handler>[0]) {
  const parameters = event.queryStringParameters ?? {};
  const mode = parameters.mode || "search";
  const query = parameters.q?.trim() ?? "";
  const language = parameters.lang?.trim() || undefined;
  const requestedLimit = Number(parameters.limit ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(MAX_LIMIT, Math.floor(requestedLimit))
    : DEFAULT_LIMIT;

  return { mode, query, language, limit };
}

function isMode(value: string): value is GeocoderMode {
  return value === "autocomplete" || value === "search";
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeBbox(value: unknown): NormalizedGeocoderResult["bbox"] {
  let coordinates: unknown[] | null = null;

  if (Array.isArray(value)) {
    coordinates = value;
  } else if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    coordinates = [object.lon1 ?? object.west, object.lat1 ?? object.south, object.lon2 ?? object.east, object.lat2 ?? object.north];
  }

  if (!coordinates || coordinates.length < 4) return undefined;

  const west = finiteNumber(coordinates[0]);
  const south = finiteNumber(coordinates[1]);
  const east = finiteNumber(coordinates[2]);
  const north = finiteNumber(coordinates[3]);
  if (west === null || south === null || east === null || north === null) return undefined;

  const clampedWest = Math.max(-180, Math.min(180, west));
  const clampedEast = Math.max(-180, Math.min(180, east));
  const clampedSouth = Math.max(-90, Math.min(90, south));
  const clampedNorth = Math.max(-90, Math.min(90, north));
  if (clampedWest > clampedEast || clampedSouth > clampedNorth) return undefined;

  return {
    north: clampedNorth,
    south: clampedSouth,
    east: clampedEast,
    west: clampedWest,
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeFeature(feature: GeoapifyFeature, index: number): NormalizedGeocoderResult | null {
  const properties = feature.properties ?? {};
  const lat = finiteNumber(properties.lat);
  const lng = finiteNumber(properties.lon ?? properties.lng);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const displayName = optionalString(properties.formatted)
    || [properties.name, properties.city, properties.state, properties.country]
      .map(optionalString)
      .filter((value): value is string => Boolean(value))
      .join(", ");
  if (!displayName) return null;

  const name = optionalString(properties.name)
    || optionalString(properties.address_line1)
    || optionalString(properties.locality)
    || optionalString(properties.city)
    || displayName;
  const placeId = optionalString(properties.place_id) || `geoapify-${index}-${lat}-${lng}`;
  const confidence = finiteNumber(
    properties.confidence
      ?? (properties.rank && typeof properties.rank === "object"
        ? (properties.rank as Record<string, unknown>).confidence
        : undefined),
  );

  return {
    id: placeId,
    provider: "geoapify",
    name,
    displayName,
    country: optionalString(properties.country),
    countryCode: optionalString(properties.country_code),
    region: optionalString(properties.state),
    city: optionalString(properties.city) || optionalString(properties.town) || optionalString(properties.village),
    district: optionalString(properties.district) || optionalString(properties.county),
    locality: optionalString(properties.suburb) || optionalString(properties.neighbourhood) || optionalString(properties.locality),
    postcode: optionalString(properties.postcode),
    lat,
    lng,
    bbox: normalizeBbox(properties.bbox ?? feature.bbox),
    placeType: optionalString(properties.result_type),
    ...(confidence === null ? {} : { confidence }),
    rawProviderType: optionalString(properties.result_type),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const { mode, query, language, limit } = getQueryParameters(event);
  if (!isMode(mode)) {
    return jsonResponse({ error: "Unsupported geocoder mode." }, 400);
  }
  if (!query) {
    return jsonResponse({ error: "Missing search query." }, 400);
  }
  if (mode === "autocomplete" && query.length < 2) {
    return jsonResponse({ error: "Search query is too short." }, 400);
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "Geocoder provider is not configured." }, 500);
  }

  const providerUrl = new URL(`https://api.geoapify.com/v1/geocode/${mode}`);
  providerUrl.searchParams.set("text", query);
  providerUrl.searchParams.set("limit", String(limit));
  providerUrl.searchParams.set("apiKey", apiKey);
  if (language) providerUrl.searchParams.set("lang", language);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(providerUrl, { signal: controller.signal });
    if (!response.ok) return jsonResponse({ error: "Geocoder provider request failed." }, 502);

    const payload = await response.json() as { features?: GeoapifyFeature[] };
    const results = Array.isArray(payload.features)
      ? payload.features
        .map(normalizeFeature)
        .filter((result): result is NormalizedGeocoderResult => result !== null)
      : [];

    return jsonResponse({ results }, 200, SUCCESS_CACHE_CONTROL);
  } catch {
    return jsonResponse({ error: "Geocoder provider request failed." }, 502);
  } finally {
    clearTimeout(timeout);
  }
};
