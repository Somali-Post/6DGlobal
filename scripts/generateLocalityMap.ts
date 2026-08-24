import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import localityMapPoints from "../src/data/localityMapPoints.json" with { type: "json" };
import { calculateSixDCode } from "../src/lib/sixd.ts";

const WIDTH = 1400;
const HEIGHT = 900;
const TILE_SIZE = 256;
const ZOOM = 12;
const SHARED_CODE = "45-52-87";
const OUTPUT = path.join(process.cwd(), "public/images/locality/london-shared-code-map.webp");

const center = localityMapPoints.reduce(
  (total, point) => ({ lat: total.lat + point.lat / localityMapPoints.length, lng: total.lng + point.lng / localityMapPoints.length }),
  { lat: 0, lng: 0 },
);

function worldPixel(lat: number, lng: number) {
  const scale = TILE_SIZE * 2 ** ZOOM;
  const sine = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  };
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function labelMarkup(name: string, pointX: number, pointY: number, northern: boolean) {
  const width = 224;
  const height = 78;
  const x = Math.max(18, Math.min(WIDTH - width - 18, pointX - width / 2));
  const y = northern ? pointY - 112 : pointY + 34;
  const lineEndY = northern ? y + height : y;

  return `
    <line x1="${pointX}" y1="${pointY}" x2="${pointX}" y2="${lineEndY}" stroke="#0874d8" stroke-width="2" stroke-dasharray="4 4"/>
    <circle cx="${pointX}" cy="${pointY}" r="13" fill="#0874d8" stroke="#ffffff" stroke-width="4"/>
    <circle cx="${pointX}" cy="${pointY}" r="4" fill="#ffffff"/>
    <g filter="url(#label-shadow)">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#ffffff" fill-opacity="0.96" stroke="#7e9cbd" stroke-width="1"/>
      <text x="${x + 16}" y="${y + 30}" fill="#07172f" font-family="Arial, sans-serif" font-size="21" font-weight="700">${escapeXml(name)}</text>
      <text x="${x + 16}" y="${y + 58}" font-family="Arial, sans-serif" font-size="19" font-weight="800">
        <tspan fill="#f35752">45</tspan><tspan fill="#788494">-</tspan><tspan fill="#22aa59">52</tspan><tspan fill="#788494">-</tspan><tspan fill="#1687e8">87</tspan>
      </text>
    </g>`;
}

async function main() {
  for (const point of localityMapPoints) {
    const calculated = calculateSixDCode(point.lat, point.lng);
    if (calculated !== SHARED_CODE) {
      throw new Error(`${point.name} calculates to ${calculated}, expected ${SHARED_CODE}.`);
    }
  }

  const centerPixel = worldPixel(center.lat, center.lng);
  const topLeft = { x: centerPixel.x - WIDTH / 2, y: centerPixel.y - HEIGHT / 2 };
  const bottomRight = { x: topLeft.x + WIDTH, y: topLeft.y + HEIGHT };
  const minTileX = Math.floor(topLeft.x / TILE_SIZE);
  const minTileY = Math.floor(topLeft.y / TILE_SIZE);
  const maxTileX = Math.floor(bottomRight.x / TILE_SIZE);
  const maxTileY = Math.floor(bottomRight.y / TILE_SIZE);
  const tileColumns = maxTileX - minTileX + 1;
  const tileRows = maxTileY - minTileY + 1;

  const tiles: sharp.OverlayOptions[] = [];
  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      const response = await fetch(`https://tile.openstreetmap.org/${ZOOM}/${tileX}/${tileY}.png`, {
        headers: { "User-Agent": "6DAddress-map-export/1.0" },
      });
      if (!response.ok) throw new Error(`OpenStreetMap tile request failed: ${response.status}`);
      tiles.push({
        input: Buffer.from(await response.arrayBuffer()),
        left: (tileX - minTileX) * TILE_SIZE,
        top: (tileY - minTileY) * TILE_SIZE,
      });
    }
  }

  const mapBuffer = await sharp({
    create: {
      width: tileColumns * TILE_SIZE,
      height: tileRows * TILE_SIZE,
      channels: 4,
      background: "#e9eef2",
    },
  })
    .composite(tiles)
    .extract({
      left: Math.round(topLeft.x - minTileX * TILE_SIZE),
      top: Math.round(topLeft.y - minTileY * TILE_SIZE),
      width: WIDTH,
      height: HEIGHT,
    })
    .modulate({ saturation: 0.72, brightness: 1.03 })
    .png()
    .toBuffer();

  const labels = localityMapPoints
    .map((point) => {
      const pixel = worldPixel(point.lat, point.lng);
      return labelMarkup(point.name, Math.round(pixel.x - topLeft.x), Math.round(pixel.y - topLeft.y), point.lat > center.lat);
    })
    .join("");

  const overlay = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="label-shadow" x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#102844" flood-opacity="0.22"/>
        </filter>
      </defs>
      ${labels}
      <g>
        <rect x="1110" y="855" width="270" height="29" rx="5" fill="#ffffff" fill-opacity="0.9"/>
        <text x="1245" y="875" text-anchor="middle" fill="#334a63" font-family="Arial, sans-serif" font-size="14">&#169; OpenStreetMap contributors</text>
      </g>
    </svg>`);

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await sharp(mapBuffer)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .webp({ quality: 90, effort: 6 })
    .toFile(OUTPUT);

  console.log(`Created ${path.relative(process.cwd(), OUTPUT)} with ${localityMapPoints.length} verified points.`);
}

await main();
