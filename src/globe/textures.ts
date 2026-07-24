import {
  CanvasTexture,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureFilter,
} from 'three';

const BLUE_MARBLE_SRC = '/textures/earth-blue-marble-december-5400.jpg';
const BLACK_MARBLE_SRC = '/textures/earth-night-lights-2012-3600.jpg';
const COUNTRY_BORDERS_SRC = '/data/ne_110m_admin_0_countries.geojson';

type LonLat = [number, number];
type GeoJsonPosition = [number, number, ...number[]];
type GeoJsonGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: GeoJsonPosition[][] | GeoJsonPosition[][][];
};
type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: GeoJsonGeometry | null;
  }>;
};
type TextureReadyCallback = () => void;

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if ('OffscreenCanvas' in window) {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function project([lon, lat]: LonLat, width: number, height: number): [number, number] {
  return [((lon + 180) / 360) * width, ((90 - lat) / 180) * height];
}

function textureFromCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): Texture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter as TextureFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load texture image: ${src}`));
    image.src = src;
  });
}

async function loadCountryBorders(): Promise<GeoJsonFeatureCollection> {
  const response = await fetch(COUNTRY_BORDERS_SRC);

  if (!response.ok) {
    throw new Error(`Unable to load country borders: ${COUNTRY_BORDERS_SRC}`);
  }

  return response.json() as Promise<GeoJsonFeatureCollection>;
}

function drawInitialSurface(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, width: number, height: number) {
  const ocean = ctx.createLinearGradient(0, 0, width, height);
  ocean.addColorStop(0, '#020b16');
  ocean.addColorStop(0.48, '#062548');
  ocean.addColorStop(1, '#010711');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  const blueWash = ctx.createRadialGradient(width * 0.58, height * 0.34, 0, width * 0.58, height * 0.34, width * 0.5);
  blueWash.addColorStop(0, 'rgba(39, 151, 235, 0.22)');
  blueWash.addColorStop(0.46, 'rgba(12, 72, 126, 0.18)');
  blueWash.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = blueWash;
  ctx.fillRect(0, 0, width, height);
}

function drawCityLightGlow(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  night: HTMLImageElement,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = `brightness(1.9) contrast(1.55) saturate(0.8) blur(${Math.max(0.35, width / 4200)}px)`;
  ctx.globalAlpha = 0.5;
  ctx.drawImage(night, 0, 0, width, height);

  ctx.filter = 'brightness(2.5) contrast(1.9) saturate(0.7)';
  ctx.globalAlpha = 0.34;
  ctx.drawImage(night, 0, 0, width, height);
  ctx.restore();
}

function drawSoftTerminator(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, width: number, height: number) {
  const shade = ctx.createLinearGradient(0, 0, width, 0);
  shade.addColorStop(0, 'rgba(0, 5, 14, 0.24)');
  shade.addColorStop(0.38, 'rgba(0, 5, 14, 0.03)');
  shade.addColorStop(0.72, 'rgba(0, 5, 14, 0.08)');
  shade.addColorStop(1, 'rgba(0, 5, 14, 0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

async function drawRealEarthSurface(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const earth = await loadImage(BLUE_MARBLE_SRC);

  ctx.drawImage(earth, 0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(0, 35, 86, 0.64)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(0, 112, 227, 0.18)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  drawSoftTerminator(ctx, width, height);
}

export function createSurfaceTexture(isMobile: boolean, onReady?: TextureReadyCallback): Texture {
  const width = isMobile ? 1024 : 1536;
  const height = width / 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Unable to create globe surface texture.');
  }

  drawInitialSurface(ctx, width, height);
  const texture = textureFromCanvas(canvas);

  void drawRealEarthSurface(ctx, width, height)
    .then(() => {
      texture.needsUpdate = true;
    })
    .catch((error: unknown) => {
      console.warn(error);
    })
    .finally(() => {
      onReady?.();
    });

  return texture;
}

export function createCityLightsTexture(isMobile: boolean, onReady?: TextureReadyCallback): Texture {
  const width = isMobile ? 1024 : 1536;
  const height = width / 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create city lights texture.');
  }

  ctx.clearRect(0, 0, width, height);
  const texture = textureFromCanvas(canvas);

  void loadImage(BLACK_MARBLE_SRC)
    .then((night) => {
      drawCityLightGlow(ctx, night, width, height);
      texture.needsUpdate = true;
    })
    .catch((error: unknown) => {
      console.warn(error);
    })
    .finally(() => {
      onReady?.();
    });

  return texture;
}

export function createSunGlowTexture(): Texture {
  const size = 512;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create sun glow texture.');
  }

  ctx.clearRect(0, 0, size, size);
  const glow = ctx.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.5);
  glow.addColorStop(0, 'rgba(255, 255, 247, 0.9)');
  glow.addColorStop(0.08, 'rgba(176, 232, 255, 0.58)');
  glow.addColorStop(0.22, 'rgba(41, 178, 255, 0.28)');
  glow.addColorStop(0.52, 'rgba(18, 111, 210, 0.08)');
  glow.addColorStop(1, 'rgba(18, 111, 210, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  return textureFromCanvas(canvas);
}

type LocationLabelContent = {
  code: string;
  details: string[];
};

export type LocationLabelPlacement = 'east' | 'west' | 'northEast' | 'northWest' | 'southEast' | 'southWest';

type LabelLayout = {
  markerX: number;
  markerY: number;
  bendX: number;
  bendY: number;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  attachX: number;
  attachY: number;
};

export const LOCATION_LABEL_TEXTURE_SIZE = { width: 640, height: 300 };

export function getLocationLabelMarkerUv(placement: LocationLabelPlacement): { u: number; v: number } {
  const layout = getLocationLabelLayout(placement);

  return {
    u: layout.markerX / LOCATION_LABEL_TEXTURE_SIZE.width,
    v: layout.markerY / LOCATION_LABEL_TEXTURE_SIZE.height,
  };
}

function getLocationLabelLayout(placement: LocationLabelPlacement): LabelLayout {
  const cardWidth = 330;
  const cardHeight = 178;

  switch (placement) {
    case 'west':
      return { markerX: 556, markerY: 150, bendX: 486, bendY: 150, cardX: 114, cardY: 60, cardWidth, cardHeight, attachX: 114 + cardWidth - 18, attachY: 202 };
    case 'northEast':
      return { markerX: 84, markerY: 214, bendX: 154, bendY: 214, cardX: 196, cardY: 34, cardWidth, cardHeight, attachX: 214, attachY: 176 };
    case 'northWest':
      return { markerX: 556, markerY: 214, bendX: 486, bendY: 214, cardX: 114, cardY: 34, cardWidth, cardHeight, attachX: 114 + cardWidth - 18, attachY: 176 };
    case 'southEast':
      return { markerX: 84, markerY: 86, bendX: 154, bendY: 86, cardX: 196, cardY: 102, cardWidth, cardHeight, attachX: 214, attachY: 124 };
    case 'southWest':
      return { markerX: 556, markerY: 86, bendX: 486, bendY: 86, cardX: 114, cardY: 102, cardWidth, cardHeight, attachX: 114 + cardWidth - 18, attachY: 124 };
    case 'east':
    default:
      return { markerX: 84, markerY: 150, bendX: 154, bendY: 150, cardX: 196, cardY: 60, cardWidth, cardHeight, attachX: 214, attachY: 202 };
  }
}

export function createLocationLabelTexture(label: LocationLabelContent, placement: LocationLabelPlacement): Texture {
  const width = 640;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create location label texture.');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = 'alphabetic';
  const { markerX, markerY, bendX, bendY, cardX, cardY, cardWidth, cardHeight, attachX, attachY } = getLocationLabelLayout(placement);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = 'rgba(1, 8, 18, 0.64)';
  ctx.strokeStyle = 'rgba(118, 199, 255, 0.36)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 24);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();

  const glassSheen = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
  glassSheen.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
  glassSheen.addColorStop(0.44, 'rgba(255, 255, 255, 0.025)');
  glassSheen.addColorStop(1, 'rgba(0, 152, 255, 0.06)');
  ctx.fillStyle = glassSheen;
  ctx.beginPath();
  ctx.roundRect(cardX + 2, cardY + 2, cardWidth - 4, cardHeight - 4, 22);
  ctx.fill();

  ctx.strokeStyle = 'rgba(118, 199, 255, 0.26)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(markerX + (placement.includes('West') || placement === 'west' ? -10 : 10), markerY);
  ctx.lineTo(bendX, bendY);
  ctx.lineTo(attachX, attachY);
  ctx.stroke();

  const markerGlow = ctx.createRadialGradient(markerX, markerY, 0, markerX, markerY, 42);
  markerGlow.addColorStop(0, 'rgba(255, 238, 177, 0.95)');
  markerGlow.addColorStop(0.22, 'rgba(48, 189, 255, 0.52)');
  markerGlow.addColorStop(0.56, 'rgba(30, 145, 255, 0.22)');
  markerGlow.addColorStop(1, 'rgba(30, 145, 255, 0)');
  ctx.fillStyle = markerGlow;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'rgba(70, 188, 255, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#eaf9ff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.font = '800 48px Inter, Arial, sans-serif';
  ctx.fillStyle = '#39a9ff';
  ctx.fillText(label.code, cardX + 28, cardY + 58);

  label.details.slice(0, 3).forEach((detail, index) => {
    ctx.font = `${index === 0 ? '650' : '600'} ${index === 0 ? 23 : 21}px Inter, Arial, sans-serif`;
    ctx.fillStyle = index === 0 ? '#eef8ff' : 'rgba(226, 241, 255, 0.74)';
    ctx.fillText(detail, cardX + 28, cardY + 96 + index * 32);
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.roundRect(cardX + 1, cardY + 1, cardWidth - 2, 1.5, 1);
  ctx.fill();

  ctx.fillStyle = '#fff5cf';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  return textureFromCanvas(canvas);
}

function drawProjectedLine(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  coordinates: GeoJsonPosition[],
  width: number,
  height: number,
) {
  let previousX: number | null = null;

  ctx.beginPath();

  coordinates.forEach(([lon, lat], index) => {
    const [x, y] = project([lon, lat], width, height);
    const crossesTextureEdge = previousX !== null && Math.abs(x - previousX) > width * 0.5;

    if (index === 0 || crossesTextureEdge) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    previousX = x;
  });

  ctx.stroke();
}

function drawCountryBorders(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  countries: GeoJsonFeatureCollection,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(171, 227, 255, 0.52)';
  ctx.lineWidth = width / 2048;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(34, 160, 255, 0.28)';
  ctx.shadowBlur = width / 1024;

  countries.features.forEach((feature) => {
    if (!feature.geometry) return;

    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as GeoJsonPosition[][]]
      : feature.geometry.coordinates as GeoJsonPosition[][][];

    polygons.forEach((polygon) => {
      polygon.forEach((ring) => drawProjectedLine(ctx, ring, width, height));
    });
  });

  ctx.restore();
}

export function createCountryBordersTexture(isMobile: boolean, onReady?: TextureReadyCallback): Texture {
  const width = isMobile ? 768 : 1024;
  const height = width / 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create country borders texture.');
  }

  ctx.clearRect(0, 0, width, height);
  const texture = textureFromCanvas(canvas);

  void loadCountryBorders()
    .then((countries) => {
      ctx.clearRect(0, 0, width, height);
      drawCountryBorders(ctx, countries, width, height);
      texture.needsUpdate = true;
    })
    .catch((error: unknown) => {
      console.warn(error);
    })
    .finally(() => {
      onReady?.();
    });

  return texture;
}
