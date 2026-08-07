import { calculateSixDCode } from "../lib/sixd";

export type LandmarkExample = {
  id: string;
  name: string;
  siteLine: string;
  cityCountryLine: string;
  imagePath: string;
  lat: number;
  lng: number;
};

export type LandmarkExampleWithCode = LandmarkExample & {
  code: string;
};

// Coordinates should be periodically verified against source data before publication.
// The visible 6D code is calculated from lat/lng; it is not manually typed.
export const landmarkExamples: LandmarkExample[] = [
  {
    id: "colosseum",
    name: "Colosseum",
    siteLine: "Piazza del Colosseo",
    cityCountryLine: "Rome, Italy",
    imagePath: "/images/landmarks/colosseum.webp",
    lat: 41.890169,
    lng: 12.492269,
  },
  {
    id: "great-pyramid-of-giza",
    name: "Great Pyramid of Giza",
    siteLine: "Al Haram",
    cityCountryLine: "Giza, Egypt",
    imagePath: "/images/landmarks/giza.webp",
    lat: 29.97915,
    lng: 31.134219,
  },
  {
    id: "white-house",
    name: "White House",
    siteLine: "1600 Pennsylvania Avenue NW",
    cityCountryLine: "Washington, DC, United States",
    imagePath: "/images/landmarks/white-house.webp",
    lat: 38.897676,
    lng: -77.03653,
  },
  {
    id: "eiffel-tower",
    name: "Eiffel Tower",
    siteLine: "Champ de Mars",
    cityCountryLine: "Paris, France",
    imagePath: "/images/landmarks/eiffel-tower.webp",
    lat: 48.858297,
    lng: 2.294478,
  },
  {
    id: "taj-mahal",
    name: "Taj Mahal",
    siteLine: "Dharmapuri",
    cityCountryLine: "Agra, India",
    imagePath: "/images/landmarks/taj-mahal.webp",
    lat: 27.175,
    lng: 78.041944,
  },
  {
    id: "christ-the-redeemer",
    name: "Christ the Redeemer",
    siteLine: "Parque Nacional da Tijuca",
    cityCountryLine: "Rio de Janeiro, Brazil",
    imagePath: "/images/landmarks/christ-redeemer.webp",
    lat: -22.951916,
    lng: -43.210464,
  },
  {
    id: "10-downing-street",
    name: "10 Downing Street",
    siteLine: "10 Downing Street",
    cityCountryLine: "London, United Kingdom",
    imagePath: "/images/landmarks/downing-street.webp",
    lat: 51.503333,
    lng: -0.127778,
  },
  {
    id: "statue-of-liberty",
    name: "Statue of Liberty",
    siteLine: "Liberty Island",
    cityCountryLine: "New York, United States",
    imagePath: "/images/landmarks/statue-liberty.webp",
    lat: 40.689249,
    lng: -74.0445,
  },
  {
    id: "sydney-opera-house",
    name: "Sydney Opera House",
    siteLine: "Bennelong Point",
    cityCountryLine: "Sydney, Australia",
    imagePath: "/images/landmarks/sydney-opera-house.webp",
    lat: -33.856784,
    lng: 151.215297,
  },
  {
    id: "burj-khalifa",
    name: "Burj Khalifa",
    siteLine: "1 Sheikh Mohammed bin Rashid Blvd",
    cityCountryLine: "Dubai, United Arab Emirates",
    imagePath: "/images/landmarks/burj-khalifa.webp",
    lat: 25.197197,
    lng: 55.274376,
  },
  {
    id: "sagrada-familia",
    name: "Sagrada Familia",
    siteLine: "Carrer de Mallorca",
    cityCountryLine: "Barcelona, Spain",
    imagePath: "/images/landmarks/sagrada-familia.webp",
    lat: 41.40363,
    lng: 2.174356,
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu",
    siteLine: "Machu Picchu Historic Sanctuary",
    cityCountryLine: "Cusco Region, Peru",
    imagePath: "/images/landmarks/machu-picchu.webp",
    lat: -13.163141,
    lng: -72.544963,
  },
  {
    id: "angkor-wat",
    name: "Angkor Wat",
    siteLine: "Krong Siem Reap",
    cityCountryLine: "Siem Reap, Cambodia",
    imagePath: "/images/landmarks/angkor-wat.webp",
    lat: 13.4125,
    lng: 103.867,
  },
  {
    id: "st-basils-cathedral",
    name: "St. Basil's Cathedral",
    siteLine: "Red Square",
    cityCountryLine: "Moscow, Russia",
    imagePath: "/images/landmarks/st-basils-cathedral.webp",
    lat: 55.7525,
    lng: 37.6231,
  },
  {
    id: "leaning-tower-of-pisa",
    name: "Leaning Tower of Pisa",
    siteLine: "Piazza del Duomo",
    cityCountryLine: "Pisa, Italy",
    imagePath: "/images/landmarks/leaning-tower-pisa.webp",
    lat: 43.722952,
    lng: 10.396597,
  },
  {
    id: "petra-treasury",
    name: "Petra Treasury",
    siteLine: "Wadi Musa",
    cityCountryLine: "Petra, Jordan",
    imagePath: "/images/landmarks/petra-treasury.webp",
    lat: 30.3285,
    lng: 35.4444,
  },
  {
    id: "louvre-museum",
    name: "Louvre Museum",
    siteLine: "Rue de Rivoli",
    cityCountryLine: "Paris, France",
    imagePath: "/images/landmarks/louvre.webp",
    lat: 48.860611,
    lng: 2.337644,
  },
];

export function withCalculatedCode(example: LandmarkExample): LandmarkExampleWithCode {
  return {
    ...example,
    code: calculateSixDCode(example.lat, example.lng),
  };
}
