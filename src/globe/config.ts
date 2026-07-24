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
  maxPixelRatio: 2,
  desktopSegments: 128,
  mobileSegments: 80,
  pointerTiltDegrees: 8,
};
