import { localityExample, LocalityExample } from "../../data/localityExamples";
import "./LocalityMapIllustration.css";

const SVG_WIDTH = 920;
const SVG_HEIGHT = 560;

const LONDON_BOUNDS = {
  north: 51.60,
  south: 51.40,
  west: -0.39,
  east: -0.02,
};

const BASE_MAP_BOUNDS = LONDON_BOUNDS;
const BASE_MAP_PATH: string | null = null;

const PLOT = {
  left: 50,
  right: 870,
  top: 132,
  bottom: 520,
};

function projectLondonPoint(lat: number, lng: number) {
  const x = PLOT.left + ((lng - BASE_MAP_BOUNDS.west) / (BASE_MAP_BOUNDS.east - BASE_MAP_BOUNDS.west)) * (PLOT.right - PLOT.left);
  const y = PLOT.top + ((BASE_MAP_BOUNDS.north - lat) / (BASE_MAP_BOUNDS.north - BASE_MAP_BOUNDS.south)) * (PLOT.bottom - PLOT.top);
  return { x, y };
}

export function LocalityMapIllustration() {
  const { code, places } = localityExample;
  const [red, green, blue] = code.split("-");

  return (
    <figure className="locality-sketch-figure craft-reveal">
      <div className="locality-sketch-panel" tabIndex={0} aria-label="Scrollable London locality proof map">
        <svg
          className="locality-sketch-map"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-labelledby="locality-map-title locality-map-description"
        >
          <title id="locality-map-title">London localities sharing the 6D reference {code}</title>
          <desc id="locality-map-description">
            Eight locality points are positioned from latitude and longitude coordinates. Every point calculates to {code}.
          </desc>

          <rect className="locality-sketch-map__paper" width={SVG_WIDTH} height={SVG_HEIGHT} rx="18" />
          <MapGrid />
          {BASE_MAP_PATH && (
            <image href={BASE_MAP_PATH} x={PLOT.left} y={PLOT.top} width={PLOT.right - PLOT.left} height={PLOT.bottom - PLOT.top} preserveAspectRatio="none" />
          )}

          <g className="locality-sketch-map__title-block">
            <text x="42" y="45" className="locality-sketch-map__kicker">ONE SHARED REFERENCE · LONDON</text>
            <text x="42" y="91" className="locality-sketch-map__shared-code">
              <tspan className="is-red">{red}</tspan>
              <tspan className="is-separator">-</tspan>
              <tspan className="is-green">{green}</tspan>
              <tspan className="is-separator">-</tspan>
              <tspan className="is-blue">{blue}</tspan>
            </text>
            <text x="878" y="49" textAnchor="end" className="locality-sketch-map__coordinates">51.60° N</text>
            <text x="878" y="68" textAnchor="end" className="locality-sketch-map__coordinates">00.39° W — 00.02° W</text>
          </g>

          {!BASE_MAP_PATH && <DiagrammaticLondon />}

          <text x="460" y="340" textAnchor="middle" className="locality-sketch-map__city">LONDON</text>

          {places.map((place) => (
            <LocalityMarker place={place} key={place.id} />
          ))}

          <text x="42" y="545" className="locality-sketch-map__note">DIAGRAMMATIC GRID · POINTS PROJECTED FROM LATITUDE / LONGITUDE</text>
          <text x="878" y="545" textAnchor="end" className="locality-sketch-map__scale">10 KM</text>
          <line x1="800" y1="538" x2="842" y2="538" className="locality-sketch-map__scale-line" />
        </svg>
      </div>
      <figcaption>Example localities in London sharing the same reference.</figcaption>
    </figure>
  );
}

function MapGrid() {
  const verticals = Array.from({ length: 19 }, (_, index) => 42 + index * 46.5);
  const horizontals = Array.from({ length: 11 }, (_, index) => 112 + index * 40);

  return (
    <g className="locality-sketch-map__grid" aria-hidden="true">
      {verticals.map((x) => <line x1={x} y1="110" x2={x} y2="522" key={`v-${x}`} />)}
      {horizontals.map((y) => <line x1="36" y1={y} x2="884" y2={y} key={`h-${y}`} />)}
      {verticals.filter((_, index) => index % 2 === 0).map((x) => <circle cx={x} cy="522" r="1.8" key={`dot-${x}`} />)}
    </g>
  );
}

function DiagrammaticLondon() {
  return (
    <g aria-hidden="true">
      <g className="locality-sketch-map__roads locality-sketch-map__roads--primary">
        <path d="M48 280C184 230 310 218 458 236S727 283 872 224" />
        <path d="M64 446C202 394 314 370 462 382S720 442 856 408" />
        <path d="M170 120C220 215 251 326 246 516" />
        <path d="M454 118C438 214 449 342 479 522" />
        <path d="M746 122C696 230 684 346 712 518" />
        <path d="M78 478C286 346 499 257 846 158" />
        <path d="M86 154C318 252 552 338 850 486" />
      </g>
      <g className="locality-sketch-map__roads locality-sketch-map__roads--secondary">
        <path d="M55 202C204 282 337 307 492 281S734 181 865 188" />
        <path d="M54 360C198 329 342 331 471 357S712 390 870 342" />
        <path d="M112 500C292 446 444 429 612 445S778 476 862 476" />
        <path d="M334 118C304 217 312 368 348 516" />
        <path d="M598 118C574 241 583 389 620 519" />
        <path d="M120 132 814 506" />
        <path d="M104 506 822 138" />
      </g>
      <path className="locality-sketch-map__ring" d="M206 323C206 217 320 158 464 164S720 232 716 330 608 486 458 480 204 427 206 323Z" />
      <path className="locality-sketch-map__river-shadow" d="M30 399C122 349 184 429 268 390S398 334 472 376 588 444 662 402 776 322 894 367" />
      <path className="locality-sketch-map__river" d="M30 391C122 341 184 421 268 382S398 326 472 368 588 436 662 394 776 314 894 359" />
      <g className="locality-sketch-map__bridges">
        <line x1="201" y1="393" x2="209" y2="414" />
        <line x1="382" y1="346" x2="390" y2="370" />
        <line x1="551" y1="406" x2="564" y2="427" />
        <line x1="734" y1="347" x2="747" y2="366" />
      </g>
    </g>
  );
}

function LocalityMarker({ place }: { place: LocalityExample }) {
  const { x, y } = projectLondonPoint(place.lat, place.lng);
  const isNorthern = place.lat >= (LONDON_BOUNDS.north + LONDON_BOUNDS.south) / 2;
  const labelWidth = 154;
  const labelHeight = 56;
  const labelX = Math.max(10, Math.min(SVG_WIDTH - labelWidth - 10, x - labelWidth / 2));
  const labelY = isNorthern ? y - 80 : y + 24;
  const leaderEndY = isNorthern ? labelY + labelHeight : labelY;
  const [red, green, blue] = place.code.split("-");

  return (
    <g className="locality-sketch-map__marker">
      <line x1={x} y1={y} x2={x} y2={leaderEndY} className="locality-sketch-map__leader" />
      <circle cx={x} cy={y} r="11" className="locality-sketch-map__marker-ring" />
      <circle cx={x} cy={y} r="4" className="locality-sketch-map__marker-dot" />
      <g transform={`translate(${labelX} ${labelY})`}>
        <rect width={labelWidth} height={labelHeight} rx="8" className="locality-sketch-map__label-card" />
        <text x="12" y="22" className="locality-sketch-map__locality-name">{place.name}</text>
        <text x="12" y="42" className="locality-sketch-map__mini-code">
          <tspan className="is-red">{red}</tspan>
          <tspan className="is-separator">-</tspan>
          <tspan className="is-green">{green}</tspan>
          <tspan className="is-separator">-</tspan>
          <tspan className="is-blue">{blue}</tspan>
        </text>
      </g>
    </g>
  );
}
