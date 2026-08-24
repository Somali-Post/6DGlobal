import { calculateSixDCode } from "../lib/sixd";
import localityMapPoints from "./localityMapPoints.json";

export type LocalityExample = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  code: string;
};

type LocalityCandidate = Omit<LocalityExample, "code">;

const EXPECTED_SHARED_CODE = "45-52-87";

// These points were reverse-geocoded against OpenStreetMap data on 2026-08-20.
// The code is always derived below with the project's current 6D calculation.
const candidates: LocalityCandidate[] = localityMapPoints;

const calculated = candidates.map((candidate) => ({
  ...candidate,
  code: calculateSixDCode(candidate.lat, candidate.lng),
}));

const verifiedLocalities = calculated.filter((candidate) => candidate.code === EXPECTED_SHARED_CODE);

if (verifiedLocalities.length !== candidates.length) {
  throw new Error(`Locality proof points must all calculate to ${EXPECTED_SHARED_CODE}.`);
}

export const localityExample = {
  city: "London",
  code: EXPECTED_SHARED_CODE,
  places: verifiedLocalities,
};
