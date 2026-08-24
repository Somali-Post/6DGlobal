export type LandmarkExample = {
  id: string;
  name: string;
  streetLine?: string;
  code: string;
  locality: string;
  cityLine?: string;
  country: string;
  lat: number;
  lng: number;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: string;
  needsReview?: boolean;
  reviewNote?: string;
};

export type LandmarkReviewExample = {
  id: string;
  name: string;
  streetLine?: string;
  locality?: string;
  cityLine?: string;
  country: string;
  needsReview: true;
  reviewNote: string;
};

// Display codes are verified against lat/lng by scripts/verifyLandmarkExamples.ts.
export const landmarkExamples: LandmarkExample[] = [
  {
    id: "sagrada-familia",
    name: "Sagrada Familia",
    streetLine: "Carrer de Mallorca 401",
    code: "07-34-63",
    locality: "Eixample",
    cityLine: "08310 Barcelona",
    country: "Spain",
    lat: 41.40363,
    lng: 2.174356,
    imageSrc: "/images/landmarks/sagrada-familia.webp",
    imageAlt: "Sagrada Familia",
  },
  {
    id: "taj-mahal",
    name: "Taj Mahal",
    streetLine: "Dharmapuri",
    code: "74-51-09",
    locality: "Agra",
    cityLine: "Uttar Pradesh 282001",
    country: "India",
    lat: 27.175,
    lng: 78.041944,
    imageSrc: "/images/landmarks/taj-mahal.webp",
    imageAlt: "Taj Mahal",
  },
  {
    id: "angkor-wat",
    name: "Angkor Wat",
    streetLine: "Angkor Wat",
    code: "16-27-50",
    locality: "Krong Siem Reap",
    country: "Cambodia",
    lat: 13.4125,
    lng: 103.867,
    imageSrc: "/images/landmarks/angkor-wat.webp",
    imageAlt: "Angkor Wat",
  },
  {
    id: "christ-the-redeemer",
    name: "Christ the Redeemer",
    streetLine: "Estrada do Corcovado",
    code: "51-10-94",
    locality: "Alto do Boa Vista",
    cityLine: "Rio de Janeiro",
    country: "Brazil",
    lat: -22.951916,
    lng: -43.210464,
    imageSrc: "/images/landmarks/christ-redeemer.webp",
    imageAlt: "Christ the Redeemer",
  },
  {
    id: "st-basils-cathedral",
    name: "St Basil's Cathedral",
    streetLine: "Red Square 7",
    code: "52-23-51",
    locality: "Kitay-gorod",
    cityLine: "Moscow",
    country: "Russia",
    lat: 55.7525,
    lng: 37.6231,
    imageSrc: "/images/landmarks/st-basils-cathedral.webp",
    imageAlt: "St Basil's Cathedral",
  },
  {
    id: "10-downing-street",
    name: "10 Downing Street",
    streetLine: "10 Downing Street",
    code: "02-37-37",
    locality: "Westminster",
    cityLine: "London SW1A 2AA",
    country: "United Kingdom",
    lat: 51.503333,
    lng: -0.127778,
    imageSrc: "/images/landmarks/downing-street.webp",
    imageAlt: "10 Downing Street",
  },
  {
    id: "white-house",
    name: "The White House",
    streetLine: "1600 Pennsylvania Ave",
    code: "93-76-65",
    locality: "Washington",
    cityLine: "DC 20500",
    country: "USA",
    lat: 38.897676,
    lng: -77.03653,
    imageSrc: "/images/landmarks/white-house.webp",
    imageAlt: "The White House",
  },
  {
    id: "petra-treasury",
    name: "Petra Treasury",
    streetLine: "Petra",
    code: "24-84-54",
    locality: "Wadi Musa",
    country: "Jordan",
    lat: 30.3285,
    lng: 35.4444,
    imageSrc: "/images/landmarks/petra-treasury.webp",
    imageAlt: "Petra Treasury",
  },
  {
    id: "statue-of-liberty",
    name: "Statue of Liberty",
    streetLine: "Liberty Island",
    code: "84-94-24",
    locality: "Liberty Island",
    cityLine: "New York, NY 10004",
    country: "USA",
    lat: 40.689249,
    lng: -74.0445,
    imageSrc: "/images/landmarks/statue-liberty.webp",
    imageAlt: "Statue of Liberty",
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu",
    streetLine: "Machu Picchu",
    code: "64-34-19",
    locality: "Aguas Calientes",
    cityLine: "Cusco",
    country: "Peru",
    lat: -13.163141,
    lng: -72.544963,
    imageSrc: "/images/landmarks/machu-picchu.webp",
    imageAlt: "Machu Picchu",
  },
  {
    id: "leaning-tower-of-pisa",
    name: "Leaning Tower of Pisa",
    streetLine: "Piazza del Duomo",
    code: "29-26-95",
    locality: "Santa Maria",
    cityLine: "56126 Pisa",
    country: "Italy",
    lat: 43.722952,
    lng: 10.396597,
    imageSrc: "/images/landmarks/leaning-tower-pisa.webp",
    imageAlt: "Leaning Tower of Pisa",
  },
  {
    id: "eiffel-tower",
    name: "Eiffel Tower",
    streetLine: "5 Avenue Anatole",
    code: "59-84-24",
    locality: "Champs de Mars",
    cityLine: "75007 Paris",
    country: "France",
    lat: 48.858297,
    lng: 2.294478,
    imageSrc: "/images/landmarks/eiffel-tower.webp",
    imageAlt: "Eiffel Tower",
  },
  {
    id: "sydney-opera-house",
    name: "Sydney Opera House",
    streetLine: "Bennelong Point",
    code: "51-65-72",
    locality: "Sydney CBD",
    cityLine: "Sydney NSW 2000",
    country: "Australia",
    lat: -33.856784,
    lng: 151.215297,
    imageSrc: "/images/landmarks/sydney-opera-house.webp",
    imageAlt: "Sydney Opera House",
  },
  {
    id: "great-pyramid-of-giza",
    name: "Great Pyramid of Giza",
    streetLine: "Al Haram",
    code: "73-94-12",
    locality: "Giza",
    country: "Egypt",
    lat: 29.97915,
    lng: 31.134219,
    imageSrc: "/images/landmarks/giza.webp",
    imageAlt: "Great Pyramid of Giza",
  },
  {
    id: "burj-khalifa",
    name: "Burj Khalifa",
    streetLine: "1 Sheikh Mohammed bin Rashid Blvd",
    code: "97-74-13",
    locality: "Dubai",
    country: "United Arab Emirates",
    lat: 25.197197,
    lng: 55.274376,
    imageSrc: "/images/landmarks/burj-khalifa.webp",
    imageAlt: "Burj Khalifa",
  },
];

export const visibleLandmarkExamples = landmarkExamples.filter((example) => !example.needsReview);

export const landmarkExamplesNeedingReview: LandmarkReviewExample[] = [
  {
    id: "notre-dame-cathedral",
    name: "Notre Dame Cathedral",
    streetLine: "7 Parvis Notre Dame",
    locality: "Île de la Cité",
    cityLine: "75004 Paris",
    country: "France",
    needsReview: true,
    reviewNote: "Coordinates and a matching image asset are not available in the project.",
  },
  {
    id: "terracotta-army",
    name: "Terracotta Army",
    streetLine: "Xianhecun",
    locality: "Lintong",
    cityLine: "Xianyang",
    country: "China",
    needsReview: true,
    reviewNote: "Coordinates and a matching image asset are not available in the project.",
  },
  {
    id: "fushimi-inari-taisha",
    name: "Fushimi Inari Taisha",
    streetLine: "68 Fukakusa Yabunouchicho",
    locality: "Fushimi",
    cityLine: "Kyoto 612-0882",
    country: "Japan",
    needsReview: true,
    reviewNote: "Coordinates and a matching image asset are not available in the project.",
  },
  {
    id: "djingareyber-mosque",
    name: "Djingareyber Mosque",
    streetLine: "Askia Mohamed Blvd",
    locality: "Timbuktu",
    country: "Mali",
    needsReview: true,
    reviewNote: "Coordinates and a matching image asset are not available in the project.",
  },
];
