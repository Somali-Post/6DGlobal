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

export function generate6DCode(coordinate: Coordinate): SixDResult {
  const snapped = snapToGridCenter(coordinate);
  const absLat = Math.abs(snapped.lat);
  const absLng = Math.abs(snapped.lng);

  const latD1 = Math.floor(absLat * 10) % 10;
  const latD2 = Math.floor(absLat * 100) % 10;
  const latD3 = Math.floor(absLat * 1000) % 10;
  const latD4 = Math.floor(absLat * 10000) % 10;
  const lngD1 = Math.floor(absLng * 10) % 10;
  const lngD2 = Math.floor(absLng * 100) % 10;
  const lngD3 = Math.floor(absLng * 1000) % 10;
  const lngD4 = Math.floor(absLng * 10000) % 10;

  return {
    coordinate: snapped,
    code: `${latD2}${lngD2}-${latD3}${lngD3}-${latD4}${lngD4}`,
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
