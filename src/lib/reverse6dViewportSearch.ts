import { reverse6dDemoIndex, type Reverse6DDemoPlace } from "../data/reverse6dDemoIndex.ts";
import { normalize6DCode } from "./reverse6dSearch.ts";
import { calculateDisplaySixDCode } from "./sixd.ts";

export type Reverse6DBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type Reverse6DViewportCandidate = {
  id: string;
  lat: number;
  lng: number;
  code: string;
  cellBounds: Reverse6DBounds;
  label: string;
  matchedDemoPlace?: Reverse6DDemoPlace;
};

export type Reverse6DViewportSearchResult = {
  candidates: Reverse6DViewportCandidate[];
  exceededLimit: boolean;
};

type AxisCell = {
  center: number;
  min: number;
  max: number;
};

const CELL_SIZE = 0.0001;
const HALF_CELL = CELL_SIZE / 2;
const CELL_MATCH_EPSILON = 1e-9;

export function findReverse6DCandidatesInBounds({
  code,
  bounds,
  maxCandidates = 50,
}: {
  code: string;
  bounds: Reverse6DBounds;
  maxCandidates?: number;
}): Reverse6DViewportSearchResult {
  const normalizedCode = normalize6DCode(code);
  const candidateLimit = Math.max(1, Math.floor(maxCandidates));
  const normalizedBounds = normalizeBounds(bounds);

  if (!normalizedCode || !normalizedBounds || !Number.isFinite(candidateLimit)) {
    return { candidates: [], exceededLimit: false };
  }

  const digits = normalizedCode.replace(/-/g, "").split("").map(Number);
  const latitudeCells = constructAxisCells(
    [digits[0], digits[2], digits[4]],
    normalizedBounds.south,
    normalizedBounds.north,
    90,
    (coordinate) => coordinate >= normalizedBounds.south && coordinate <= normalizedBounds.north,
  );
  const longitudeCells = constructAxisCells(
    [digits[1], digits[3], digits[5]],
    normalizedBounds.west > normalizedBounds.east ? -180 : normalizedBounds.west,
    normalizedBounds.west > normalizedBounds.east ? 180 : normalizedBounds.east,
    180,
    (coordinate) => longitudeIsInBounds(coordinate, normalizedBounds),
  );
  const matchingDemoPlaces = reverse6dDemoIndex.filter(
    (place) => calculateDisplaySixDCode(place.lat, place.lng) === normalizedCode,
  );
  const candidates: Reverse6DViewportCandidate[] = [];

  for (const latitudeCell of latitudeCells) {
    for (const longitudeCell of longitudeCells) {
      const lat = latitudeCell.center;
      const lng = longitudeCell.center;

      // This is the canonical verification path for every constructed candidate.
      if (calculateDisplaySixDCode(lat, lng) !== normalizedCode) continue;

      if (candidates.length === candidateLimit) {
        return { candidates, exceededLimit: true };
      }

      const cellBounds = {
        north: latitudeCell.max,
        south: latitudeCell.min,
        east: longitudeCell.max,
        west: longitudeCell.min,
      };
      const matchedDemoPlace = matchingDemoPlaces.find((place) =>
        demoPlaceMatchesCell(place, lat, lng, cellBounds)
      );

      candidates.push({
        id: `viewport-${lat.toFixed(5)}-${lng.toFixed(5)}`,
        lat,
        lng,
        code: normalizedCode,
        cellBounds,
        label: matchedDemoPlace?.displayName ?? "Matching 6D cell",
        ...(matchedDemoPlace ? { matchedDemoPlace } : {}),
      });
    }
  }

  return { candidates, exceededLimit: false };
}

function constructAxisCells(
  digits: [number, number, number],
  boundStart: number,
  boundEnd: number,
  coordinateLimit: number,
  isInBounds: (coordinate: number) => boolean,
): AxisCell[] {
  const largestAbsoluteBound = Math.min(
    coordinateLimit,
    Math.max(Math.abs(boundStart), Math.abs(boundEnd)),
  );
  const largestRelevantDegree = Math.ceil(largestAbsoluteBound);
  const cells: AxisCell[] = [];
  const seen = new Set<string>();

  for (let degree = 0; degree <= largestRelevantDegree; degree += 1) {
    for (let firstDecimal = 0; firstDecimal <= 9; firstDecimal += 1) {
      const absoluteBase = roundCoordinate(
        degree
          + firstDecimal * 0.1
          + digits[0] * 0.01
          + digits[1] * 0.001
          + digits[2] * 0.0001,
      );
      const absoluteCenter = roundCoordinate(absoluteBase + HALF_CELL);

      for (const sign of [-1, 1]) {
        const center = roundCoordinate(sign * absoluteCenter);
        if (Math.abs(center) > coordinateLimit || !isInBounds(center)) continue;

        const key = center.toFixed(5);
        if (seen.has(key)) continue;
        seen.add(key);

        if (sign > 0) {
          cells.push({
            center,
            min: absoluteBase,
            max: roundCoordinate(absoluteBase + CELL_SIZE),
          });
        } else {
          cells.push({
            center,
            min: roundCoordinate(-(absoluteBase + CELL_SIZE)),
            max: roundCoordinate(-absoluteBase),
          });
        }
      }
    }
  }

  return cells.sort((left, right) => left.center - right.center);
}

function normalizeBounds(bounds: Reverse6DBounds): Reverse6DBounds | null {
  if (![bounds.north, bounds.south, bounds.east, bounds.west].every(Number.isFinite)) return null;

  const north = Math.min(90, bounds.north);
  const south = Math.max(-90, bounds.south);
  const east = Math.max(-180, Math.min(180, bounds.east));
  const west = Math.max(-180, Math.min(180, bounds.west));

  if (south > north) return null;
  return { north, south, east, west };
}

function longitudeIsInBounds(longitude: number, bounds: Reverse6DBounds) {
  return bounds.west <= bounds.east
    ? longitude >= bounds.west && longitude <= bounds.east
    : longitude >= bounds.west || longitude <= bounds.east;
}

function demoPlaceMatchesCell(
  place: Reverse6DDemoPlace,
  candidateLat: number,
  candidateLng: number,
  bounds: Reverse6DBounds,
) {
  const isInsideCell = place.lat >= bounds.south - CELL_MATCH_EPSILON
    && place.lat <= bounds.north + CELL_MATCH_EPSILON
    && place.lng >= bounds.west - CELL_MATCH_EPSILON
    && place.lng <= bounds.east + CELL_MATCH_EPSILON;
  const isExtremelyClose = Math.abs(place.lat - candidateLat) <= HALF_CELL + CELL_MATCH_EPSILON
    && Math.abs(place.lng - candidateLng) <= HALF_CELL + CELL_MATCH_EPSILON;

  return isInsideCell || isExtremelyClose;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(10));
}
