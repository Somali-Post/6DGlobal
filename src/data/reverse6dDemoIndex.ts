import { addressExamples } from "./addressExamples.ts";
import { landmarkExamples } from "./landmarkExamples.ts";
import { localityExample } from "./localityExamples.ts";

export type Reverse6DDemoPlace = {
  id: string;
  name: string;
  aliases: string[];
  type: "somalia" | "uk-locality" | "landmark";
  country: string;
  admin1?: string;
  city?: string;
  locality?: string;
  displayName: string;
  addressLines: string[];
  lat: number;
  lng: number;
  expectedCode?: string;
};

const londonAliases: Record<string, string[]> = {
  "dollis-hill": ["Harlesden", "Willesden"],
  "chalk-farm": ["Kentish Town", "Belsize Park"],
  "lower-clapton": ["Clapton"],
};

const londonPlaces: Reverse6DDemoPlace[] = localityExample.places.map((place) => ({
  id: `london-${place.id}`,
  name: place.name,
  aliases: londonAliases[place.id] ?? [],
  type: "uk-locality",
  country: "United Kingdom",
  city: localityExample.city,
  locality: place.name,
  displayName: `${place.name}, ${localityExample.city}, United Kingdom`,
  addressLines: [place.name, localityExample.city, "United Kingdom"],
  lat: place.lat,
  lng: place.lng,
  expectedCode: localityExample.code,
}));

const landmarkPlaces: Reverse6DDemoPlace[] = landmarkExamples.map((example) => ({
  id: `landmark-${example.id}`,
  name: example.name,
  aliases: [example.streetLine].filter((value): value is string => Boolean(value)),
  type: "landmark",
  country: example.country,
  locality: example.locality,
  city: example.cityLine,
  displayName: [example.name, example.locality, example.cityLine, example.country].filter(Boolean).join(", "),
  addressLines: [example.streetLine, example.locality, example.cityLine, example.country].filter(
    (value): value is string => Boolean(value)
  ),
  lat: example.lat,
  lng: example.lng,
  expectedCode: example.code,
}));

const somaliaAddressPlaces: Reverse6DDemoPlace[] = addressExamples
  .filter((example) => example.country === "Somalia")
  .map((example) => {
    const [locality, city] = (example.contextLines[0] ?? "").split(",").map((value) => value.trim());

    return {
      id: "somalia-hodan",
      name: locality || "Hodan",
      aliases: [],
      type: "somalia",
      country: example.country,
      city,
      locality,
      displayName: [locality, city, example.country].filter(Boolean).join(", "),
      addressLines: example.completeAddressLines,
      lat: example.latitude,
      lng: example.longitude,
      expectedCode: example.code,
    };
  });

// These coordinates are the existing, displayed Bender Qassim example in App.tsx.
const benderQassimPlace: Reverse6DDemoPlace = {
  id: "somalia-bender-qassim-international-airport",
  name: "Bender Qassim International Airport",
  aliases: ["Bosaso Airport", "Bosaaso Airport", "Bender Kassim Airport"],
  type: "somalia",
  country: "Somalia",
  admin1: "Bari / Puntland",
  city: "Bosaso",
  locality: "Bender Qassim International Airport",
  displayName: "Bender Qassim International Airport, Bosaso, Bari / Puntland, Somalia",
  addressLines: ["Bender Qassim International Airport", "Bosaso", "Bari", "Puntland", "Somalia"],
  lat: 11.275278,
  lng: 49.141389,
  expectedCode: "74-51-23",
};

export const reverse6dDemoIndex: Reverse6DDemoPlace[] = [
  ...londonPlaces,
  ...somaliaAddressPlaces,
  benderQassimPlace,
  ...landmarkPlaces,
];
