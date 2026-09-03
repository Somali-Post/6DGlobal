import localityMapPoints from "../src/data/localityMapPoints.json" with { type: "json" };
import { calculateSixDCode } from "../src/lib/sixd.ts";

const EXPECTED_SHARED_CODE = "45-52-87";

let hasMismatch = false;

for (const point of localityMapPoints) {
  const calculatedCode = calculateSixDCode(point.lat, point.lng);
  const status = calculatedCode === EXPECTED_SHARED_CODE ? "OK" : "MISMATCH";

  console.log(`${status} ${point.name} ${point.lat} ${point.lng} ${calculatedCode}`);

  if (calculatedCode !== EXPECTED_SHARED_CODE) {
    hasMismatch = true;
  }
}

if (hasMismatch) {
  throw new Error(`Locality map points must all calculate to ${EXPECTED_SHARED_CODE}.`);
}
