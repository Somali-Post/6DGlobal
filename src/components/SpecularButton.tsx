import { CSSProperties, MouseEvent, ReactNode, Ref, useEffect, useRef } from "react";
import { Color, Mesh, Program, Renderer, Triangle, type OGLRenderingContext } from "ogl";
import "./SpecularButton.css";

const PAD = 20;
const DEMO_RADIUS = 18;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

type SpecularButtonProps = {
  children: ReactNode;
  className?: string;
  intensity?: "strong" | "subtle";
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
};

type ShaderProps = {
  radius: number;
  lineColor: string;
  baseColor: string;
  intensity: number;
  shineSize: number;
  shineFade: number;
  thickness: number;
  speed: number;
  followMouse: boolean;
  proximity: number;
  autoAnimate: boolean;
};

function SpecularButton({
  children,
  className = "",
  intensity = "strong",
  href,
  type = "button",
  disabled = false,
  onClick,
}: SpecularButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const fxRef = useRef<HTMLSpanElement | null>(null);
  const shaderPropsRef = useRef<ShaderProps>({
    radius: DEMO_RADIUS,
    lineColor: "#ffffff",
    baseColor: "#525252",
    intensity: 1,
    shineSize: 10,
    shineFade: 40,
    thickness: 1,
    speed: 0.35,
    followMouse: true,
    proximity: 250,
    autoAnimate: false,
  });

  shaderPropsRef.current = {
    ...shaderPropsRef.current,
    radius: DEMO_RADIUS,
    lineColor: "#ffffff",
    baseColor: "#525252",
    intensity: 1,
    shineSize: 10,
    shineFade: 40,
    thickness: 1,
    speed: 0.35,
    followMouse: true,
    proximity: 250,
    autoAnimate: false,
  };

  useEffect(() => {
    const button = buttonRef.current;
    const fx = fxRef.current;
    if (!button || !fx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let renderer: Renderer | null = null;
    let gl: OGLRenderingContext | null = null;
    let canvas: HTMLCanvasElement | null = null;

    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr, webgl: 2 });
      gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const geometry = new Triangle(gl);
      if ((geometry as unknown as { attributes: Record<string, unknown> }).attributes.uv) {
        delete (geometry as unknown as { attributes: Record<string, unknown> }).attributes.uv;
      }

      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uCenter: { value: [0, 0] },
          uHalfSize: { value: [1, 1] },
          uRadius: { value: 0 },
          uAngle: { value: 2.4 },
          uPx: { value: dpr },
          uLineColor: { value: [1, 1, 1] },
          uBaseColor: { value: [0.32, 0.32, 0.32] },
          uIntensity: { value: 1 },
          uShineSize: { value: 0.17 },
          uShineFade: { value: 0.7 },
          uThickness: { value: 1 },
          uBaseWidth: { value: dpr },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });
      canvas = gl.canvas as HTMLCanvasElement;
      fx.appendChild(canvas);

      const sizeRef = { w: 1, h: 1 };
      const resize = () => {
        const rect = button.getBoundingClientRect();
        sizeRef.w = rect.width;
        sizeRef.h = rect.height;
        renderer?.setSize(rect.width + PAD * 2, rect.height + PAD * 2);
        program.uniforms.uCenter.value = [(PAD + rect.width / 2) * dpr, (PAD + rect.height / 2) * dpr];
        program.uniforms.uHalfSize.value = [(rect.width / 2) * dpr, (rect.height / 2) * dpr];
      };

      const ro = new ResizeObserver(resize);
      ro.observe(button);
      resize();

      let pointerAngle: number | null = null;
      let proximityT = 0;
      const onPointerMove = (event: PointerEvent) => {
        const rect = button.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
        const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
        const dist = Math.hypot(dx, dy);

        if (dist === 0) {
          const nx = (event.clientX - cx) / (rect.width / 2);
          const ny = (cy - event.clientY) / (rect.height / 2);
          pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15;
        } else {
          pointerAngle = Math.atan2(cy - event.clientY, event.clientX - cx);
        }

        const t = Math.max(0, 1 - dist / Math.max(shaderPropsRef.current.proximity, 1));
        proximityT = t * t * (3 - 2 * t);
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      let angle = 2.4;
      let idleAngle = 2.4;
      let bright = 0;
      let last = performance.now();
      let raf = 0;
      const lineColor = new Color();
      const baseColor = new Color();

      const update = (now: number) => {
        raf = requestAnimationFrame(update);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const props = shaderPropsRef.current;

        idleAngle += props.speed * dt;
        const steer = props.followMouse && pointerAngle != null && (!props.autoAnimate || proximityT > 0);
        const target = steer && pointerAngle != null ? pointerAngle : idleAngle;
        const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        angle += diff * (1 - Math.exp(-dt * 7));

        const brightTarget = props.autoAnimate ? 1 : proximityT;
        bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));

        lineColor.set(props.lineColor);
        baseColor.set(props.baseColor);
        program.uniforms.uAngle.value = angle;
        program.uniforms.uRadius.value = Math.min(props.radius, Math.min(sizeRef.w, sizeRef.h) / 2) * dpr;
        program.uniforms.uLineColor.value = [lineColor.r, lineColor.g, lineColor.b];
        program.uniforms.uBaseColor.value = [baseColor.r, baseColor.g, baseColor.b];
        program.uniforms.uIntensity.value = props.intensity * bright;
        program.uniforms.uShineSize.value = (props.shineSize * Math.PI) / 180;
        program.uniforms.uShineFade.value = (props.shineFade * Math.PI) / 180;
        program.uniforms.uThickness.value = props.thickness * dpr;
        renderer?.render({ scene: mesh });
      };
      raf = requestAnimationFrame(update);

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        if (canvas?.parentNode === fx) fx.removeChild(canvas);
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      };
    } catch {
      if (canvas?.parentNode === fx) fx.removeChild(canvas);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }, []);

  const specularClass = `specular-button specular-${intensity} ${className}`.trim();
  const style = {
    "--sb-radius": `${DEMO_RADIUS}px`,
    borderRadius: `${DEMO_RADIUS}px`,
  } as CSSProperties;
  const content = (
    <>
      <span ref={fxRef} className="specular-button__fx" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        ref={buttonRef as Ref<HTMLAnchorElement>}
        href={href}
        className={specularClass}
        onClick={onClick}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={buttonRef as Ref<HTMLButtonElement>}
      type={type}
      className={specularClass}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {content}
    </button>
  );
}

export default SpecularButton;
