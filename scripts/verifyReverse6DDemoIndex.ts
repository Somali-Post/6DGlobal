import { reverse6dDemoIndex } from "../src/data/reverse6dDemoIndex.ts";
import { searchReverse6DDemoIndex } from "../src/lib/reverse6dSearch.ts";
import { findReverse6DCandidatesInBounds } from "../src/lib/reverse6dViewportSearch.ts";
import { calculateDisplaySixDCode } from "../src/lib/sixd.ts";

const sharedLondonCode = "45-52-87";
let hasMismatch = false;

for (const [label, type] of [["Somalia", "somalia"], ["UK / London", "uk-locality"], ["Landmarks", "landmark"]] as const) {
  console.log(`\n${label}`);
  for (const place of reverse6dDemoIndex.filter((candidate) => candidate.type === type)) {
    const calculatedCode = calculateDisplaySixDCode(place.lat, place.lng);
    const expectedCode = place.expectedCode ?? "(none)";
    const validExpectedCode = !place.expectedCode || place.expectedCode === calculatedCode;
    const validLondonCode = type !== "uk-locality" || calculatedCode === sharedLondonCode;
    const status = validExpectedCode && validLondonCode ? "OK" : "MISMATCH";
    console.log(`${status} ${place.name}: ${calculatedCode} (expected ${expectedCode})`);
    if (!validExpectedCode || !validLondonCode) hasMismatch = true;
  }
}

if (hasMismatch) process.exitCode = 1;

function check(condition: boolean, message: string) {
  const status = condition ? "OK" : "MISMATCH";
  console.log(`${status} ${message}`);
  if (!condition) hasMismatch = true;
}

console.log("\nViewport candidate geometry");
const londonViewport = findReverse6DCandidatesInBounds({
  code: sharedLondonCode,
  bounds: { north: 51.58, south: 51.40, east: 0, west: -0.30 },
  maxCandidates: 50,
});
check(!londonViewport.exceededLimit, "London viewport stays under the candidate limit");
check(londonViewport.candidates.length === 6, "London viewport constructs the six possible cells");
check(
  londonViewport.candidates.every((candidate) => calculateDisplaySixDCode(candidate.lat, candidate.lng) === sharedLondonCode),
  "every London viewport candidate verifies through calculateDisplaySixDCode",
);
check(
  londonViewport.candidates.every((candidate) => candidate.matchedDemoPlace),
  "all six London cells are enriched from the local demo index",
);

const negativeLongitudeCandidate = londonViewport.candidates.find(
  (candidate) => candidate.lat === 51.54585 && candidate.lng === -0.15275,
);
check(
  negativeLongitudeCandidate?.cellBounds.west === -0.1528
    && negativeLongitudeCandidate.cellBounds.east === -0.1527,
  "negative longitude cell bounds keep west less than east",
);
check(
  negativeLongitudeCandidate?.cellBounds.south === 51.5458
    && negativeLongitudeCandidate.cellBounds.north === 51.5459,
  "positive latitude cell bounds keep south less than north",
);

const zeroCrossingViewport = findReverse6DCandidatesInBounds({
  code: sharedLondonCode,
  bounds: { north: 0.06, south: -0.06, east: 0.06, west: -0.06 },
  maxCandidates: 50,
});
check(
  zeroCrossingViewport.candidates.length === 4
    && zeroCrossingViewport.candidates.some((candidate) => candidate.lat < 0 && candidate.lng < 0)
    && zeroCrossingViewport.candidates.some((candidate) => candidate.lat > 0 && candidate.lng > 0),
  "coordinates on both sides of zero are constructed",
);

const antimeridianViewport = findReverse6DCandidatesInBounds({
  code: sharedLondonCode,
  bounds: { north: 0.06, south: -0.06, east: -179.9, west: 179.9 },
  maxCandidates: 50,
});
check(
  antimeridianViewport.candidates.some((candidate) => candidate.lng < -170)
    && antimeridianViewport.candidates.some((candidate) => candidate.lng > 170),
  "antimeridian-crossing bounds search both longitude segments",
);

const limitedViewport = findReverse6DCandidatesInBounds({
  code: sharedLondonCode,
  bounds: { north: 51.58, south: 51.40, east: 0, west: -0.30 },
  maxCandidates: 2,
});
check(
  limitedViewport.exceededLimit && limitedViewport.candidates.length === 2,
  "candidate limit stops collection and reports overflow",
);

const mogadishuViewport = findReverse6DCandidatesInBounds({
  code: "31-22-19",
  bounds: { north: 2.04, south: 2.02, east: 45.32, west: 45.30 },
  maxCandidates: 50,
});
check(
  mogadishuViewport.candidates.length === 1
    && mogadishuViewport.candidates[0].matchedDemoPlace?.name === "Hodan",
  "Mogadishu viewport finds and enriches the known Hodan cell",
);

console.log("\nReverse-search regressions");
check(
  searchReverse6DDemoIndex(sharedLondonCode, "London").length === 6,
  "London context still returns all six indexed locality choices",
);
check(
  searchReverse6DDemoIndex("74-51-23", "Bosaaso Airport")[0]?.place.name === "Bender Qassim International Airport",
  "Bosaaso Airport alias still resolves to Bender Qassim",
);

if (hasMismatch) process.exitCode = 1;
