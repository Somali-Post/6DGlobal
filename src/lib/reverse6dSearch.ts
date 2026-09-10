import { reverse6dDemoIndex, type Reverse6DDemoPlace } from "../data/reverse6dDemoIndex.ts";
import { calculateDisplaySixDCode } from "./sixd.ts";

export type Reverse6DMatchReason = "exact" | "alias" | "startsWith" | "contains" | "fuzzy" | "broad";

export type Reverse6DSearchResult = {
  place: Reverse6DDemoPlace;
  code: string;
  score: number;
  confidence: "high" | "medium" | "low";
  matchReason: Reverse6DMatchReason;
  didYouMean?: boolean;
};

export function normalize6DCode(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");
  return digits.length === 6 ? `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}` : null;
}

export function parseCombinedReverse6DInput(input: string): { code: string | null; place: string } {
  const match = input.match(/^\s*(\d{2})\s*(?:-\s*|\s+)?(\d{2})\s*(?:-\s*|\s+)?(\d{2})(?=$|[\s+,/|:;\-–—])/);
  if (!match) return { code: null, place: input.trim() };

  const code = normalize6DCode(`${match[1]}${match[2]}${match[3]}`);
  const place = input
    .slice(match[0].length)
    .replace(/^[\s+,/|:;\-–—]+/, "")
    .trim();

  return { code, place };
}

export function normalizeSearchText(input: string): string {
  return input
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function getCalculatedCode(place: Reverse6DDemoPlace): string {
  return calculateDisplaySixDCode(place.lat, place.lng);
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + Number(left[leftIndex - 1] !== right[rightIndex - 1])
      );
      diagonal = above;
    }
  }

  return previous[right.length];
}

function fuzzyMatch(query: string, value: string) {
  if (query.length < 3) return false;
  const maxDistance = query.length <= 5 ? 1 : 2;
  return value.split(" ").some((word) => levenshteinDistance(query, word) <= maxDistance);
}

function makeResult(place: Reverse6DDemoPlace, score: number, confidence: Reverse6DSearchResult["confidence"], matchReason: Reverse6DMatchReason, didYouMean = false): Reverse6DSearchResult {
  return { place, code: getCalculatedCode(place), score, confidence, matchReason, ...(didYouMean ? { didYouMean } : {}) };
}

export function getDemoPlacesByCode(code: string): Reverse6DSearchResult[] {
  const normalizedCode = normalize6DCode(code);
  if (!normalizedCode) return [];

  return reverse6dDemoIndex
    .filter((place) => getCalculatedCode(place) === normalizedCode)
    .map((place) => makeResult(place, 0, "low", "broad"));
}

export function searchReverse6DDemoIndex(code: string, query: string): Reverse6DSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  const candidates = getDemoPlacesByCode(code);
  if (!normalizedQuery) return candidates;

  return candidates
    .map((result) => {
      const { place } = result;
      const name = normalizeSearchText(place.name);
      const aliases = place.aliases.map(normalizeSearchText);
      const broadFields = [place.locality, place.city, place.admin1, place.country, place.displayName, ...place.addressLines]
        .filter((value): value is string => Boolean(value))
        .map(normalizeSearchText);

      if (name === normalizedQuery) return makeResult(place, 100, "high", "exact");
      if (aliases.includes(normalizedQuery)) return makeResult(place, 95, "high", "alias", normalizedQuery !== name);
      if ([name, ...aliases].some((value) => value.startsWith(normalizedQuery))) {
        return makeResult(place, 85, "high", "startsWith");
      }
      if ([name, ...aliases, ...broadFields].some((value) => value.includes(normalizedQuery))) {
        return makeResult(place, 70, "medium", "contains");
      }
      if ([name, ...aliases].some((value) => fuzzyMatch(normalizedQuery, value))) {
        return makeResult(place, 55, "medium", "fuzzy", true);
      }
      if (broadFields.some((value) => normalizedQuery.includes(value) || value.includes(normalizedQuery))) {
        return makeResult(place, 30, "low", "broad");
      }
      return null;
    })
    .filter((result): result is Reverse6DSearchResult => result !== null)
    .sort((left, right) => right.score - left.score || left.place.name.localeCompare(right.place.name));
}
