import { calculateSixDCode } from "../lib/sixd";

export type LocalityExample = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  code: string;
};

type LocalityCandidate = Omit<LocalityExample, "code">;

// These points were reverse-geocoded against OpenStreetMap data on 2026-08-20.
// The code is always derived below with the project's current 6D calculation.
const candidates: LocalityCandidate[] = [
  { id: "greenford", name: "Greenford", lat: 51.54585, lng: -0.35275 },
  { id: "dollis-hill", name: "Dollis Hill", lat: 51.54585, lng: -0.25275 },
  { id: "chalk-farm", name: "Chalk Farm", lat: 51.54585, lng: -0.15275 },
  { id: "clapton", name: "Clapton", lat: 51.54585, lng: -0.05275 },
  { id: "whitton", name: "Whitton", lat: 51.44585, lng: -0.35275 },
  { id: "east-sheen", name: "East Sheen", lat: 51.44585, lng: -0.25275 },
  { id: "balham", name: "Balham", lat: 51.44585, lng: -0.15275 },
  { id: "forest-hill", name: "Forest Hill", lat: 51.44585, lng: -0.05275 },
];

const calculated = candidates.map((candidate) => ({
  ...candidate,
  code: calculateSixDCode(candidate.lat, candidate.lng),
}));

const sharedCode = calculated[0]?.code;
const verifiedLocalities = calculated.filter((candidate) => candidate.code === sharedCode);

if (!sharedCode || verifiedLocalities.length !== candidates.length) {
  throw new Error("Locality proof points must all calculate to one shared 6D code.");
}

export const localityExample = {
  city: "London",
  code: sharedCode,
  places: verifiedLocalities,
};
