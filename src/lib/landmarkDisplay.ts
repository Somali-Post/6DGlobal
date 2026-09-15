import type { LandmarkExample } from "../data/landmarkExamples";

function normalizeLandmarkLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getLandmarkStreetLine(landmark: LandmarkExample) {
  if (!landmark.streetLine) return undefined;

  const streetLine = normalizeLandmarkLabel(landmark.streetLine);
  if (!streetLine) return undefined;

  if (streetLine === normalizeLandmarkLabel(landmark.name)) return undefined;
  if (streetLine === normalizeLandmarkLabel(landmark.locality)) return undefined;

  return landmark.streetLine;
}
