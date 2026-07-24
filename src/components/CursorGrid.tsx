import { RefObject, useEffect, useRef } from "react";
import "./CursorGrid.css";

type Falloff = "smooth" | "linear";

type CursorGridProps = {
  cellSize?: number;
  color?: string;
  radius?: number;
  falloff?: Falloff;
  holdTime?: number;
  fadeDuration?: number;
  lineWidth?: number;
  maxOpacity?: number;
  fillOpacity?: number;
  gridOpacity?: number;
  cellRadius?: number;
  clickPulse?: boolean;
  pulseSpeed?: number;
  trackTargetRef?: RefObject<HTMLElement | null>;
  trackWindow?: boolean;
};

type CellState = {
  intensity: number;
  lastActive: number;
};

type Pulse = {
  x: number;
  y: number;
  start: number;
};

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function CursorGrid({
  cellSize = 70,
  color = "#006CE3",
  radius = 140,
  falloff = "smooth",
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1.2,
  maxOpacity = 0.85,
  fillOpacity = 0,
  gridOpacity = 0.04,
  cellRadius = 0,
  clickPulse = false,
  pulseSpeed = 600,
  trackTargetRef,
  trackWindow = false,
}: CursorGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellStatesRef = useRef<Map<string, CellState>>(new Map());
  const pulsesRef = useRef<Pulse[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const frameRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1, cols: 0, rows: 0 });
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = prefersReducedMotion();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = {
        width: rect.width,
        height: rect.height,
        dpr,
        cols: Math.ceil(rect.width / cellSize),
        rows: Math.ceil(rect.height / cellSize),
      };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const schedule = () => {
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(loop);
      }
    };

    const setPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active:
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom,
      };

      if (!reducedMotionRef.current) {
        activateNearbyCells(performance.now());
        schedule();
      }
    };

    const clearPointer = () => {
      pointerRef.current.active = false;
      schedule();
    };

    const addPulse = (event: PointerEvent) => {
      if (!clickPulse || reducedMotionRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      pulsesRef.current.push({ x, y, start: performance.now() });
      schedule();
    };

    const trackTarget = trackWindow ? window : trackTargetRef?.current ?? window;
    trackTarget.addEventListener("pointermove", setPointer as EventListener, { passive: true });
    trackTarget.addEventListener("pointerdown", addPulse as EventListener, { passive: true });
    trackTarget.addEventListener("pointerleave", clearPointer as EventListener, { passive: true });

    const onMotionChange = () => {
      reducedMotionRef.current = prefersReducedMotion();
      cellStatesRef.current.clear();
      pulsesRef.current = [];
      draw(performance.now());
    };

    motionQuery?.addEventListener("change", onMotionChange);

    function activateNearbyCells(now: number) {
      const pointer = pointerRef.current;
      if (!pointer.active) return;

      const { cols, rows } = sizeRef.current;
      const minCol = Math.max(0, Math.floor((pointer.x - radius) / cellSize));
      const maxCol = Math.min(cols - 1, Math.floor((pointer.x + radius) / cellSize));
      const minRow = Math.max(0, Math.floor((pointer.y - radius) / cellSize));
      const maxRow = Math.min(rows - 1, Math.floor((pointer.y + radius) / cellSize));

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const centerX = col * cellSize + cellSize / 2;
          const centerY = row * cellSize + cellSize / 2;
          const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
          if (distance > radius) continue;
          const t = 1 - distance / radius;
          const intensity = falloff === "smooth" ? t * t * (3 - 2 * t) : t;
          const key = `${col}:${row}`;
          const existing = cellStatesRef.current.get(key);
          cellStatesRef.current.set(key, {
            intensity: Math.max(existing?.intensity ?? 0, intensity),
            lastActive: now,
          });
        }
      }
    }

    function drawCell(col: number, row: number, opacity: number, fill: number) {
      const x = col * cellSize + lineWidth / 2;
      const y = row * cellSize + lineWidth / 2;
      const size = cellSize - lineWidth;

      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      if (cellRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, cellRadius);
        if (fill > 0) {
          ctx.globalAlpha = fill;
          ctx.fillStyle = color;
          ctx.fill();
          ctx.globalAlpha = opacity;
        }
        ctx.stroke();
        return;
      }

      if (fill > 0) {
        ctx.globalAlpha = fill;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        ctx.globalAlpha = opacity;
      }
      ctx.strokeRect(x, y, size, size);
    }

    function draw(now: number) {
      const { width, height, cols, rows } = sizeRef.current;
      ctx.clearRect(0, 0, width, height);

      if (gridOpacity > 0) {
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            drawCell(col, row, gridOpacity, 0);
          }
        }
      }

      if (reducedMotionRef.current) return;

      for (const [key, state] of cellStatesRef.current) {
        const elapsed = now - state.lastActive;
        const fadeElapsed = Math.max(0, elapsed - holdTime);
        const fade = fadeElapsed <= 0 ? 1 : Math.max(0, 1 - fadeElapsed / fadeDuration);

        if (fade <= 0.01) {
          cellStatesRef.current.delete(key);
          continue;
        }

        const [col, row] = key.split(":").map(Number);
        const opacity = state.intensity * fade * maxOpacity;
        drawCell(col, row, opacity, fillOpacity * opacity);
      }

      pulsesRef.current = pulsesRef.current.filter((pulse) => {
        const age = now - pulse.start;
        const waveRadius = (age / 1000) * pulseSpeed;
        const widthPx = cellSize * 1.35;
        const maxDistance = Math.hypot(sizeRef.current.width, sizeRef.current.height);

        if (waveRadius > maxDistance + widthPx) return false;

        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const centerX = col * cellSize + cellSize / 2;
            const centerY = row * cellSize + cellSize / 2;
            const distance = Math.hypot(centerX - pulse.x, centerY - pulse.y);
            const delta = Math.abs(distance - waveRadius);
            if (delta > widthPx) continue;
            const band = 1 - delta / widthPx;
            const ageFade = Math.max(0, 1 - age / 1400);
            drawCell(col, row, band * ageFade * maxOpacity, 0);
          }
        }

        return true;
      });
    }

    function loop(now: number) {
      frameRef.current = null;
      activateNearbyCells(now);
      draw(now);

      if (cellStatesRef.current.size > 0 || pulsesRef.current.length > 0 || pointerRef.current.active) {
        frameRef.current = requestAnimationFrame(loop);
      }
    }

    return () => {
      observer.disconnect();
      trackTarget.removeEventListener("pointermove", setPointer as EventListener);
      trackTarget.removeEventListener("pointerdown", addPulse as EventListener);
      trackTarget.removeEventListener("pointerleave", clearPointer as EventListener);
      motionQuery?.removeEventListener("change", onMotionChange);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [
    cellSize,
    color,
    radius,
    falloff,
    holdTime,
    fadeDuration,
    lineWidth,
    maxOpacity,
    fillOpacity,
    gridOpacity,
    cellRadius,
    clickPulse,
    pulseSpeed,
    trackTargetRef,
    trackWindow,
  ]);

  return <canvas className="cursor-grid-canvas" ref={canvasRef} />;
}

export default CursorGrid;
