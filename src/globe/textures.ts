import {
  CanvasTexture,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureFilter,
} from 'three';

const BLUE_MARBLE_SRC = '/images/globe/earth-day-1536.webp';
const BLACK_MARBLE_SRC = '/images/globe/earth-night-1536.webp';
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

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, value));
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
  ocean.addColorStop(0, '#00050d');
  ocean.addColorStop(0.5, '#03142c');
  ocean.addColorStop(1, '#000309');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  const blueWash = ctx.createRadialGradient(width * 0.58, height * 0.34, 0, width * 0.58, height * 0.34, width * 0.5);
  blueWash.addColorStop(0, 'rgba(34, 132, 215, 0.08)');
  blueWash.addColorStop(0.46, 'rgba(8, 50, 98, 0.08)');
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
  ctx.filter = `sepia(0.28) hue-rotate(-12deg) saturate(1.28) brightness(2.35) contrast(2.25) blur(${Math.max(0.16, width / 6800)}px)`;
  ctx.globalAlpha = 0.48;
  ctx.drawImage(night, 0, 0, width, height);

  ctx.filter = 'sepia(0.34) hue-rotate(-14deg) saturate(1.38) brightness(3.3) contrast(3)';
  ctx.globalAlpha = 0.42;
  ctx.drawImage(night, 0, 0, width, height);

  ctx.filter = 'sepia(0.5) hue-rotate(-18deg) saturate(1.5) brightness(4.3) contrast(3.6)';
  ctx.globalAlpha = 0.16;
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

function processEarthSurfaceImage(ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const brightness = (r + g + b) / 3;
    const blueDominant = b > r * 1.16 && b > g * 1.06;
    const deepOcean = blueDominant && brightness < 180;

    if (deepOcean) {
      r *= 0.34;
      g *= 0.44;
      b *= 0.62;
      b += 5;
    } else {
      r = (r - 128) * 1.18 + 128;
      g = (g - 128) * 1.18 + 128;
      b = (b - 128) * 1.12 + 128;
      r *= 0.68;
      g *= 0.78;
      b *= 0.88;
    }

    data[i] = clampChannel(r * 0.86);
    data[i + 1] = clampChannel(g * 0.88);
    data[i + 2] = clampChannel(b * 0.92);
  }

  ctx.putImageData(imageData, 0, 0);
}

async function drawRealEarthSurface(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const earth = await loadImage(BLUE_MARBLE_SRC);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'contrast(1.24) saturate(0.94) brightness(0.82)';
  ctx.drawImage(earth, 0, 0, width, height);
  ctx.filter = 'none';
  processEarthSurfaceImage(ctx, width, height);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(0, 12, 34, 0.46)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(34, 114, 196, 0.06)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(0, 6, 14, 0.2)';
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

export function createLimbGlowTexture(): Texture {
  const size = 512;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create limb glow texture.');
  }

  ctx.clearRect(0, 0, size, size);
  const glow = ctx.createRadialGradient(size * 0.5, size * 0.5, 8, size * 0.5, size * 0.5, size * 0.48);
  glow.addColorStop(0, 'rgba(205, 240, 255, 0.72)');
  glow.addColorStop(0.18, 'rgba(135, 205, 255, 0.4)');
  glow.addColorStop(0.42, 'rgba(72, 154, 255, 0.18)');
  glow.addColorStop(0.76, 'rgba(28, 108, 235, 0.055)');
  glow.addColorStop(1, 'rgba(9, 62, 139, 0)');
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

const LOCATION_LABEL_PIXEL_RATIO = 2;
export const LOCATION_LABEL_TEXTURE_SIZE = { width: 640, height: 300 };

export function getLocationLabelMarkerUv(placement: LocationLabelPlacement): { u: number; v: number } {
  const layout = getLocationLabelLayout(placement);

  return {
    u: layout.markerX / LOCATION_LABEL_TEXTURE_SIZE.width,
    v: layout.markerY / LOCATION_LABEL_TEXTURE_SIZE.height,
  };
}

function getLocationLabelLayout(placement: LocationLabelPlacement): LabelLayout {
  const cardWidth = 364;
  const cardHeight = 192;

  switch (placement) {
    case 'west':
      return { markerX: 556, markerY: 150, bendX: 512, bendY: 150, cardX: 100, cardY: 54, cardWidth, cardHeight, attachX: 100 + cardWidth - 16, attachY: 202 };
    case 'northEast':
      return { markerX: 84, markerY: 214, bendX: 128, bendY: 214, cardX: 176, cardY: 24, cardWidth, cardHeight, attachX: 194, attachY: 176 };
    case 'northWest':
      return { markerX: 556, markerY: 214, bendX: 512, bendY: 214, cardX: 100, cardY: 24, cardWidth, cardHeight, attachX: 100 + cardWidth - 16, attachY: 176 };
    case 'southEast':
      return { markerX: 84, markerY: 86, bendX: 128, bendY: 86, cardX: 176, cardY: 90, cardWidth, cardHeight, attachX: 194, attachY: 122 };
    case 'southWest':
      return { markerX: 556, markerY: 86, bendX: 512, bendY: 86, cardX: 100, cardY: 90, cardWidth, cardHeight, attachX: 100 + cardWidth - 16, attachY: 122 };
    case 'east':
    default:
      return { markerX: 84, markerY: 150, bendX: 128, bendY: 150, cardX: 176, cardY: 54, cardWidth, cardHeight, attachX: 194, attachY: 202 };
  }
}

function drawColourCodedCode(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  code: string,
  x: number,
  y: number,
) {
  const segments = code.split('-');
  const colours = ['#ff7468', '#39d07c', '#63b2ff'];
  const separatorColour = 'rgba(214, 228, 244, 0.65)';
  let cursorX = x;

  segments.forEach((segment, index) => {
    ctx.fillStyle = colours[index] ?? '#55aaff';
    ctx.fillText(segment, cursorX, y);
    cursorX += ctx.measureText(segment).width;

    if (index < segments.length - 1) {
      ctx.fillStyle = separatorColour;
      ctx.fillText(' - ', cursorX, y);
      cursorX += ctx.measureText(' - ').width;
    }
  });
}

export function createLocationLabelTexture(label: LocationLabelContent, placement: LocationLabelPlacement): Texture {
  const width = LOCATION_LABEL_TEXTURE_SIZE.width * LOCATION_LABEL_PIXEL_RATIO;
  const height = LOCATION_LABEL_TEXTURE_SIZE.height * LOCATION_LABEL_PIXEL_RATIO;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create location label texture.');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.scale(LOCATION_LABEL_PIXEL_RATIO, LOCATION_LABEL_PIXEL_RATIO);
  ctx.textBaseline = 'alphabetic';
  const { markerX, markerY, bendX, bendY, cardX, cardY, cardWidth, cardHeight, attachX, attachY } = getLocationLabelLayout(placement);

  ctx.shadowColor = 'rgba(0, 5, 14, 0.38)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(4, 9, 18, 0.92)';
  ctx.strokeStyle = 'rgba(105, 185, 255, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 13);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();

  const surfaceDepth = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
  surfaceDepth.addColorStop(0, 'rgba(255, 255, 255, 0.045)');
  surfaceDepth.addColorStop(0.28, 'rgba(255, 255, 255, 0.016)');
  surfaceDepth.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = surfaceDepth;
  ctx.beginPath();
  ctx.roundRect(cardX + 1.5, cardY + 1.5, cardWidth - 3, cardHeight - 3, 11);
  ctx.fill();

  ctx.strokeStyle = 'rgba(130, 215, 255, 0.92)';
  ctx.lineWidth = 1.85;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(markerX + (placement.includes('West') || placement === 'west' ? -8 : 8), markerY);
  ctx.lineTo(bendX, bendY);
  ctx.lineTo(attachX, attachY);
  ctx.stroke();

  const markerGlow = ctx.createRadialGradient(markerX, markerY, 2, markerX, markerY, 40);
  markerGlow.addColorStop(0, 'rgba(126, 220, 255, 0.48)');
  markerGlow.addColorStop(0.42, 'rgba(84, 190, 255, 0.24)');
  markerGlow.addColorStop(1, 'rgba(30, 145, 255, 0)');
  ctx.fillStyle = markerGlow;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'rgba(95, 205, 255, 0.6)';
  ctx.shadowBlur = 9;
  ctx.strokeStyle = 'rgba(2, 7, 16, 0.96)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f4fdff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 6.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#73d1ff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 2.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  const textX = cardX + 23;
  ctx.font = '700 46px Inter, Arial, sans-serif';
  drawColourCodedCode(ctx, label.code, textX, cardY + 58);

  label.details.slice(0, 3).forEach((detail, index) => {
    const fontSize = index === 0 ? 35 : index === 1 && label.details.length > 2 ? 27 : 24;
    const fontWeight = index === 0 ? '660' : index === 1 && label.details.length > 2 ? '560' : '530';
    const fillStyle = index === 0
      ? 'rgba(248, 251, 255, 0.98)'
      : index === label.details.length - 1
        ? 'rgba(222, 232, 243, 0.78)'
        : 'rgba(232, 240, 248, 0.86)';

    ctx.font = `${fontWeight} ${fontSize}px Inter, Arial, sans-serif`;
    ctx.fillStyle = fillStyle;
    ctx.fillText(detail, textX, cardY + 110 + index * 38);
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.roundRect(cardX + 12, cardY + 1, cardWidth - 24, 1.2, 1);
  ctx.fill();

  ctx.shadowColor = 'rgba(95, 205, 255, 0.46)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = 'rgba(192, 242, 255, 0.96)';
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 10, 0, Math.PI * 2);
  ctx.stroke();

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
  ctx.strokeStyle = 'rgba(205, 239, 255, 0.72)';
  ctx.lineWidth = width / 1550;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(44, 168, 255, 0.1)';
  ctx.shadowBlur = Math.max(0.18, width / 6200);

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
  const width = isMobile ? 1024 : 1536;
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
