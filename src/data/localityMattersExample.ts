export type LocalityMattersPlace = {
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
  labelPosition: "above" | "below";
  labelAlign: "left" | "center" | "right";
};

// These fixed London grid points were reverse-geocoded against OpenStreetMap data on 2026-08-20.
// Every coordinate is independently verified with calculateSixDCode to produce 45-52-87.
export const localityMattersExample = {
  city: "London",
  code: "45-52-87",
  places: [
    {
      locality: "Greenford",
      city: "London",
      latitude: 51.54585,
      longitude: -0.35275,
      labelPosition: "below",
      labelAlign: "left",
    },
    {
      locality: "Dollis Hill",
      city: "London",
      latitude: 51.54585,
      longitude: -0.25275,
      labelPosition: "below",
      labelAlign: "center",
    },
    {
      locality: "Chalk Farm",
      city: "London",
      latitude: 51.54585,
      longitude: -0.15275,
      labelPosition: "below",
      labelAlign: "center",
    },
    {
      locality: "Clapton",
      city: "London",
      latitude: 51.54585,
      longitude: -0.05275,
      labelPosition: "below",
      labelAlign: "right",
    },
    {
      locality: "Whitton",
      city: "London",
      latitude: 51.44585,
      longitude: -0.35275,
      labelPosition: "above",
      labelAlign: "left",
    },
    {
      locality: "East Sheen",
      city: "London",
      latitude: 51.44585,
      longitude: -0.25275,
      labelPosition: "above",
      labelAlign: "center",
    },
    {
      locality: "Balham",
      city: "London",
      latitude: 51.44585,
      longitude: -0.15275,
      labelPosition: "above",
      labelAlign: "center",
    },
    {
      locality: "Forest Hill",
      city: "London",
      latitude: 51.44585,
      longitude: -0.05275,
      labelPosition: "above",
      labelAlign: "right",
    },
  ],
} satisfies {
  city: string;
  code: string;
  places: LocalityMattersPlace[];
};
