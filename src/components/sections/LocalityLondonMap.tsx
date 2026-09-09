import type { CSSProperties } from "react";
import localityMapPoints from "../../data/localityMapPoints.json";
import { calculateSixDCode } from "../../lib/sixd";

type LocalityMapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  labelOffset: {
    x: number;
    y: number;
  };
};

type LocalityLondonMapProps = {
  className?: string;
  /**
   * Override this with your production tile provider if you do not want to use
   * the public OpenStreetMap tile server.
   *
   * Tokens supported: {z}, {x}, {y}
   */
  tileUrlTemplate?: string;
  /**
   * The map zoom used for the static tile composition.
   * Zoom 12 separates the six London points while retaining useful city context.
   */
  zoom?: number;
};

/**
 * These are coordinate points selected to produce the same 6D reference:
 * 45-52-87.
 *
 * Important:
 * They are not arbitrary CSS positions. The component projects each lat/lng
 * onto the map using Web Mercator, the same projection used by OSM/Leaflet.
 *
 * East Sheen was intentionally not used because the matching 45-52-87 point
 * near the southwest cluster sits closer to Roehampton/Putney than East Sheen.
 */
const localityPoints: LocalityMapPoint[] = localityMapPoints.map((point, index) => ({
  ...point,
  labelOffset: {
    x: [-96, -92, -100, -96, -92, -96][index],
    y: index < 3 ? 116 : -104,
  },
}));

const SHARED_CODE = "45-52-87";
const TILE_SIZE = 256;
const MAP_WIDTH = 1120;
const MAP_HEIGHT = 720;
const DEFAULT_ZOOM = 12;
const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/**
 * The visual centre is fixed to the selected six-point cluster.
 * This avoids the “northwest shift” that happens when pins are overlaid on a
 * screenshot with guessed CSS percentages.
 */
const MAP_CENTER = {
  lat: 51.49585,
  lng: -0.15275,
};

function lonToWorldX(lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  return ((lng + 180) / 360) * scale;
}

function latToWorldY(lat: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const radians = (lat * Math.PI) / 180;
  const mercator = Math.log(Math.tan(Math.PI / 4 + radians / 2));
  return ((1 - mercator / Math.PI) / 2) * scale;
}

function projectPoint(
  lat: number,
  lng: number,
  zoom: number,
  topLeft: { x: number; y: number }
) {
  return {
    x: lonToWorldX(lng, zoom) - topLeft.x,
    y: latToWorldY(lat, zoom) - topLeft.y,
  };
}

function getTileUrl(template: string, z: number, x: number, y: number) {
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

function getTiles(zoom: number, tileUrlTemplate: string) {
  const centerWorld = {
    x: lonToWorldX(MAP_CENTER.lng, zoom),
    y: latToWorldY(MAP_CENTER.lat, zoom),
  };

  const topLeft = {
    x: centerWorld.x - MAP_WIDTH / 2,
    y: centerWorld.y - MAP_HEIGHT / 2,
  };

  const minTileX = Math.floor(topLeft.x / TILE_SIZE);
  const maxTileX = Math.floor((topLeft.x + MAP_WIDTH) / TILE_SIZE);
  const minTileY = Math.floor(topLeft.y / TILE_SIZE);
  const maxTileY = Math.floor((topLeft.y + MAP_HEIGHT) / TILE_SIZE);
  const tileCount = 2 ** zoom;

  const tiles = [];

  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      if (tileY < 0 || tileY >= tileCount) continue;

      const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;

      tiles.push({
        key: `${tileX}-${tileY}`,
        src: getTileUrl(tileUrlTemplate, zoom, wrappedTileX, tileY),
        left: tileX * TILE_SIZE - topLeft.x,
        top: tileY * TILE_SIZE - topLeft.y,
      });
    }
  }

  return {
    tiles,
    topLeft,
  };
}

function percent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

function Code({ code = SHARED_CODE, className = "" }: { code?: string; className?: string }) {
  const [red, green, blue] = code.split("-");

  return (
    <span className={`llm-code ${className}`} aria-label={code}>
      <span className="llm-code__red">{red}</span>
      <span className="llm-code__dash">-</span>
      <span className="llm-code__green">{green}</span>
      <span className="llm-code__dash">-</span>
      <span className="llm-code__blue">{blue}</span>
    </span>
  );
}

export function LocalityLondonMap({
  className = "",
  tileUrlTemplate = DEFAULT_TILE_URL,
  zoom = DEFAULT_ZOOM,
}: LocalityLondonMapProps) {
  const { tiles, topLeft } = getTiles(zoom, tileUrlTemplate);

  const projectedPoints = localityPoints.map((point) => ({
    ...point,
    code: calculateSixDCode(point.lat, point.lng),
    position: projectPoint(point.lat, point.lng, zoom, topLeft),
  }));

  const mismatches = projectedPoints.filter((point) => point.code !== SHARED_CODE);

  if (import.meta.env.DEV && mismatches.length > 0) {
    console.warn(
      "[LocalityLondonMap] Some points do not match the shared 6D code.",
      mismatches.map((point) => ({
        name: point.name,
        expected: SHARED_CODE,
        calculated: point.code,
        lat: point.lat,
        lng: point.lng,
      }))
    );
  }

  return (
    <figure className={`llm-shell ${className}`.trim()}>
      <div className="llm-frame" aria-label="London map showing six localities sharing the same 6D code">
        <div className="llm-map" style={{ "--llm-ratio": `${MAP_WIDTH} / ${MAP_HEIGHT}` } as CSSProperties}>
          {tiles.map((tile) => (
            <img
              alt=""
              aria-hidden="true"
              className="llm-tile"
              decoding="async"
              draggable={false}
              key={tile.key}
              loading="lazy"
              src={tile.src}
              style={{
                left: percent(tile.left, MAP_WIDTH),
                top: percent(tile.top, MAP_HEIGHT),
                width: percent(TILE_SIZE, MAP_WIDTH),
                height: percent(TILE_SIZE, MAP_HEIGHT),
              }}
            />
          ))}

          <div className="llm-overlay" aria-hidden="true" />

          <div className="llm-header">
            <div>
              <p className="llm-kicker">One shared reference · London</p>
            </div>
            <p className="llm-note">Locality completes the address</p>
          </div>

          <svg
            aria-hidden="true"
            className="llm-leaders"
            preserveAspectRatio="none"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          >
            {projectedPoints.map((point) => {
              const labelX = point.position.x + point.labelOffset.x;
              const labelY = point.position.y + point.labelOffset.y;
              const labelAnchorX = labelX + 92;
              const labelAnchorY = labelY + (point.labelOffset.y < 0 ? 42 : -42);

              return (
                <line
                  className="llm-leader-line"
                  key={point.id}
                  x1={point.position.x}
                  x2={labelAnchorX}
                  y1={point.position.y}
                  y2={labelAnchorY}
                />
              );
            })}
          </svg>

          {projectedPoints.map((point) => {
            const labelLeft = point.position.x + point.labelOffset.x;
            const labelTop = point.position.y + point.labelOffset.y;
            const labelCenterX = labelLeft + 92;

            return (
              <div className="llm-point-group" key={point.id}>
                <span
                  className="llm-marker"
                  style={{
                    left: percent(point.position.x, MAP_WIDTH),
                    top: percent(point.position.y, MAP_HEIGHT),
                  }}
                >
                  <span className="llm-marker__core" />
                </span>

                <span
                  className="llm-label"
                  style={{
                    left: percent(labelCenterX, MAP_WIDTH),
                    top: percent(labelTop, MAP_HEIGHT),
                  }}
                >
                  <strong>{point.name}</strong>
                  <Code code={point.code} className="llm-code--small" />
                </span>
              </div>
            );
          })}

          <p className="llm-attribution">© OpenStreetMap contributors</p>
        </div>
      </div>

      <figcaption className="llm-caption">
        Example localities in London sharing the same 6D reference.
      </figcaption>

      <style>{`
        .llm-shell {
          margin: 0;
          min-width: 0;
          width: 100%;
          container-type: inline-size;
        }

        .llm-frame {
          overflow: hidden;
          border: 1px solid color-mix(in oklch, var(--brand-blue, #2493ed) 35%, rgba(255,255,255,0.22));
          border-radius: clamp(1rem, 1.7vw, 1.6rem);
          background: oklch(0.985 0.012 245);
          box-shadow:
            0 26px 80px rgba(0, 20, 48, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.78);
        }

        .llm-map {
          position: relative;
          aspect-ratio: var(--llm-ratio);
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(240, 249, 255, 0.84), rgba(231, 243, 252, 0.9));
          isolation: isolate;
        }

        .llm-tile {
          position: absolute;
          z-index: 1;
          display: block;
          max-width: none;
          object-fit: cover;
          opacity: 0.9;
          filter: saturate(0.88) contrast(0.98) brightness(1.02);
          user-select: none;
          pointer-events: none;
        }

        .llm-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            radial-gradient(circle at 0 0, rgba(248, 252, 255, 0.92), rgba(248, 252, 255, 0) 35%),
            radial-gradient(circle at 100% 0, rgba(248, 252, 255, 0.92), rgba(248, 252, 255, 0) 35%),
            radial-gradient(circle at 0 100%, rgba(248, 252, 255, 0.92), rgba(248, 252, 255, 0) 35%),
            radial-gradient(circle at 100% 100%, rgba(248, 252, 255, 0.92), rgba(248, 252, 255, 0) 35%),
            linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.14));
          box-shadow: inset 0 0 clamp(2.75rem, 7cqi, 5.5rem) rgba(248, 252, 255, 0.5);
        }

        .llm-header {
          position: absolute;
          inset: 1.35rem 1.45rem auto 1.45rem;
          z-index: 8;
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          align-items: flex-start;
          pointer-events: none;
        }

        .llm-kicker,
        .llm-note,
        .llm-caption,
        .llm-attribution {
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .llm-kicker {
          margin: 0 0 0.42rem;
          color: color-mix(in oklch, var(--brand-blue, #2493ed) 65%, #062047);
          font-size: clamp(0.64rem, 0.7vw, 0.78rem);
          font-weight: 800;
        }

        .llm-note {
          max-width: none;
          margin: 0;
          color: color-mix(in oklch, var(--brand-blue, #2493ed) 56%, #062047);
          font-size: clamp(0.58rem, 0.62vw, 0.68rem);
          font-weight: 800;
          line-height: 1.45;
          text-align: right;
          white-space: nowrap;
        }

        .llm-code {
          display: inline-flex;
          align-items: baseline;
          gap: 0.07em;
          white-space: nowrap;
          font-family: var(--font-display, inherit);
          font-variant-numeric: tabular-nums;
          font-weight: 850;
          line-height: 0.95;
        }

        .llm-code__red {
          color: var(--sixd-red, #ff5f57);
        }

        .llm-code__green {
          color: var(--sixd-green, #35c46d);
        }

        .llm-code__blue {
          color: var(--sixd-blue, #2493ed);
        }

        .llm-code__dash {
          color: color-mix(in oklch, var(--brand-blue, #2493ed) 18%, #6d7785);
          font-weight: 750;
        }

        .llm-code--small {
          margin-top: 0.28rem;
          font-size: clamp(0.72rem, 0.9vw, 1rem);
        }

        .llm-leaders {
          position: absolute;
          inset: 0;
          z-index: 5;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .llm-leader-line {
          stroke: var(--sixd-blue, #2493ed);
          stroke-width: 1.25;
          stroke-linecap: round;
          stroke-dasharray: 3 5;
          opacity: 0.54;
        }

        .llm-marker {
          position: absolute;
          z-index: 7;
          display: inline-flex;
          width: clamp(1rem, 1.5vw, 1.55rem);
          height: clamp(1rem, 1.5vw, 1.55rem);
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          border-radius: 999px;
          background: var(--sixd-blue, #2493ed);
          box-shadow:
            0 0 0 3px color-mix(in oklch, var(--sixd-blue, #2493ed) 20%, transparent),
            0 9px 20px rgba(0, 67, 143, 0.32);
          transform: translate(-50%, -50%);
        }

        .llm-marker__core {
          width: 34%;
          height: 34%;
          border-radius: inherit;
          background: #ffffff;
        }

        .llm-label {
          position: absolute;
          z-index: 9;
          display: grid;
          box-sizing: border-box;
          place-items: center;
          min-width: clamp(7.5rem, 13vw, 11.5rem);
          row-gap: 0.18rem;
          overflow: hidden;
          padding: clamp(0.9rem, 1.7cqi, 1.25rem) clamp(0.75rem, 1.5cqi, 1.1rem);
          border: 1px solid rgba(205, 230, 248, 0.92);
          border-radius: clamp(0.85rem, 1.8cqi, 1.15rem);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.76), rgba(235, 247, 255, 0.6));
          backdrop-filter: blur(16px) saturate(1.08);
          -webkit-backdrop-filter: blur(16px) saturate(1.08);
          box-shadow:
            0 18px 38px rgba(18, 60, 105, 0.2),
            0 4px 12px rgba(18, 60, 105, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 1),
            inset 0 -1px 0 rgba(174, 215, 244, 0.34),
            inset 0 0 24px rgba(211, 236, 252, 0.32);
          color: #07111f;
          text-align: center;
          width: clamp(7.5rem, 21cqi, 11.5rem);
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .llm-label strong {
          font-size: clamp(0.9rem, 1.25vw, 1.25rem);
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .llm-attribution {
          position: absolute;
          right: 0.6rem;
          bottom: 0.48rem;
          z-index: 10;
          margin: 0;
          padding: 0.25rem 0.38rem;
          border-radius: 0.25rem;
          background: rgba(255, 255, 255, 0.72);
          color: #41536a;
          font-size: 0.56rem;
          letter-spacing: 0;
          text-transform: none;
        }

        .llm-caption {
          margin: 0.75rem 0 0;
          color: rgba(210, 223, 238, 0.72);
          font-size: clamp(0.78rem, 0.8vw, 0.9rem);
          line-height: 1.45;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        @media (max-width: 760px) {
          .llm-map {
            aspect-ratio: 1 / 1;
          }

          .llm-header {
            inset: 1rem 1rem auto 1rem;
          }

          .llm-note {
            display: none;
          }

          .llm-label {
            min-width: 0;
            width: 26%;
            padding: 0.48rem 0.42rem;
          }

          .llm-label strong {
            overflow: hidden;
            font-size: clamp(0.62rem, 3.2cqi, 0.82rem);
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .llm-code--small {
            font-size: clamp(0.56rem, 2.7cqi, 0.7rem);
          }
        }
      `}</style>
    </figure>
  );
}

export default LocalityLondonMap;
