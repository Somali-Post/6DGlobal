export type Coordinate = {
  lat: number;
  lng: number;
};

export type SixDResult = {
  coordinate: Coordinate;
  code: string;
  localitySuffix: string;
};

export function snapToGridCenter(coordinate: Coordinate): Coordinate {
  const scale = 10000;
  const halfCell = 0.00005;

  return {
    lat: Math.floor(coordinate.lat * scale) / scale + halfCell,
    lng: Math.floor(coordinate.lng * scale) / scale + halfCell,
  };
}

export function calculateSixDCode(lat: number, lng: number): string {
  const getDigits = (value: number) => {
    const decimal = Math.abs(value).toFixed(6).split(".")[1] ?? "000000";

    return {
      second: decimal[1] ?? "0",
      third: decimal[2] ?? "0",
      fourth: decimal[3] ?? "0",
    };
  };

  const latDigits = getDigits(lat);
  const lngDigits = getDigits(lng);

  return [
    `${latDigits.second}${lngDigits.second}`,
    `${latDigits.third}${lngDigits.third}`,
    `${latDigits.fourth}${lngDigits.fourth}`,
  ].join("-");
}

export function generate6DCode(coordinate: Coordinate): SixDResult {
  const snapped = snapToGridCenter(coordinate);
  const absLat = Math.abs(snapped.lat);
  const absLng = Math.abs(snapped.lng);

  const latD1 = Math.floor(absLat * 10) % 10;
  const lngD1 = Math.floor(absLng * 10) % 10;

  return {
    coordinate: snapped,
    code: calculateSixDCode(snapped.lat, snapped.lng),
    localitySuffix: `${latD1}${lngD1}`,
  };
}

export function formatCompleteAddress(args: {
  line1: string;
  code: string;
  locality: string;
  cityLine: string;
}) {
  return `${args.line1}\n${args.code} ${args.locality}\n${args.cityLine}`;
}
