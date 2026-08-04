export type AddressExample = {
  country: string;
  latitude: number;
  longitude: number;
  code: string;
  contextLines: string[];
  completeAddressLines: string[];
};

export const addressExamples: AddressExample[] = [
  {
    country: "Somalia",
    latitude: 2.032189,
    longitude: 45.312983,
    code: "31-22-19",
    contextLines: ["Hodan, Mogadishu", "Somalia"],
    completeAddressLines: ["31-22-19 Hodan, Mogadishu", "Somalia"],
  },
  {
    country: "Pakistan",
    latitude: 26.932701,
    longitude: 64.078386,
    code: "37-28-73",
    contextLines: ["Panjgur District", "Balochistan", "Pakistan"],
    completeAddressLines: ["37-28-73 Panjgur District", "Balochistan", "Pakistan"],
  },
  {
    country: "India",
    latitude: 12.277211,
    longitude: 76.637814,
    code: "73-77-28",
    contextLines: ["JP Nagar", "Mysuru", "India"],
    completeAddressLines: ["73-77-28 JP Nagar", "Mysuru", "India"],
  },
  {
    country: "Sierra Leone",
    latitude: 7.879227,
    longitude: -11.343555,
    code: "74-93-25",
    contextLines: ["Blama", "Kenema District", "Sierra Leone"],
    completeAddressLines: ["74-93-25 Blama", "Kenema District", "Sierra Leone"],
  },
];

export function splitCompleteAddress(example: AddressExample) {
  const firstLine = example.completeAddressLines[0] ?? "";
  const displayLocality = firstLine.startsWith(example.code)
    ? firstLine.slice(example.code.length).trimStart()
    : firstLine;

  return {
    displayLocality,
    remainingLines: example.completeAddressLines.slice(1),
  };
}
