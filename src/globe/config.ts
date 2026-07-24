export type GlobeConfig = {
  rotationDuration: number;
  initialLongitude: number;
  globeScale: number;
  horizontalOffset: number;
  gridOpacity: number;
  atmosphereIntensity: number;
  maxPixelRatio: number;
  desktopSegments: number;
  mobileSegments: number;
  pointerTiltDegrees: number;
};

export const GLOBE_CONFIG: GlobeConfig = {
  rotationDuration: 50,
  initialLongitude: -150,
  globeScale: 1,
  horizontalOffset: 0.22,
  gridOpacity: 0.24,
  atmosphereIntensity: 0.82,
  maxPixelRatio: 1.5,
  desktopSegments: 96,
  mobileSegments: 64,
  pointerTiltDegrees: 8,
};
