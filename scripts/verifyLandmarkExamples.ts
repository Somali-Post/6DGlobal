import { landmarkExamples, landmarkExamplesNeedingReview } from "../src/data/landmarkExamples.ts";
import { generate6DCode } from "../src/lib/sixd.ts";

let hasVisibleMismatch = false;
const visibleIds = new Set<string>();

for (const example of landmarkExamples) {
  const calculatedCode = generate6DCode({ lat: example.lat, lng: example.lng }).code;

  if (example.needsReview) {
    console.log(`NEEDS REVIEW: ${example.id} ${example.reviewNote ?? "Address data requires confirmation"}`);
    continue;
  }

  if (visibleIds.has(example.id)) {
    console.error(`DUPLICATE: ${example.id}`);
    hasVisibleMismatch = true;
    continue;
  }
  visibleIds.add(example.id);

  if (calculatedCode !== example.code) {
    console.error(`MISMATCH: ${example.id} stored ${example.code} calculated ${calculatedCode}`);
    hasVisibleMismatch = true;
    continue;
  }

  console.log(`OK: ${example.id} ${calculatedCode}`);
}

for (const example of landmarkExamplesNeedingReview) {
  console.log(`NEEDS REVIEW: ${example.id} ${example.reviewNote}`);
}

if (hasVisibleMismatch) process.exitCode = 1;
