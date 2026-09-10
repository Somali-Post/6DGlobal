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
  rotationDuration: 160,
  initialLongitude: -150,
  globeScale: 1,
  horizontalOffset: 0.22,
  gridOpacity: 0.075,
  atmosphereIntensity: 1.05,
  maxPixelRatio: 1.5,
  desktopSegments: 128,
  mobileSegments: 64,
  pointerTiltDegrees: 8,
};
