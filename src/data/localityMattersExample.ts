export type LocalityMattersPlace = {
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
};

export const localityMattersExample = {
  city: "London",
  code: "88-55-00",
  image: "/images/why-locality-matters-map.webp",
  mobileImage: "/images/why-locality-matters-map-mobile.webp",
  places: [
    {
      locality: "Hampstead Garden Suburb",
      city: "London",
      latitude: 51.58505,
      longitude: -0.18505,
    },
    {
      locality: "South Tottenham",
      city: "London",
      latitude: 51.58505,
      longitude: -0.08505,
    },
    {
      locality: "Bermondsey Village",
      city: "London",
      latitude: 51.48505,
      longitude: -0.08505,
    },
    {
      locality: "Selhurst",
      city: "London",
      latitude: 51.38505,
      longitude: -0.08505,
    },
  ],
} satisfies {
  city: string;
  code: string;
  image: string;
  mobileImage: string;
  places: LocalityMattersPlace[];
};
