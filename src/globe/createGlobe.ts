import {
  AmbientLight,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  Sprite,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLOBE_CONFIG, type GlobeConfig } from './config';
import { calculateSixDCode } from '../lib/sixd';
import {
  createAtmosphereRimMaterial,
  createCityLightsMaterial,
  createGridMaterial,
  createLimbGlowMaterial,
  createSurfaceMaterial,
} from './materials';
import {
  createCityLightsTexture,
  createCountryBordersTexture,
  createLimbGlowTexture,
  createLocationLabelTexture,
  getLocationLabelMarkerUv,
  createSurfaceTexture,
  type LocationLabelPlacement,
} from './textures';

export type HeroGlobeOptions = Partial<GlobeConfig> & {
  container: HTMLElement;
  desktopGlobeScale?: number;
  autoRotate?: boolean;
  reducedMotion?: boolean;
  layout?: 'hero' | 'centered';
  onProgress?: (loaded: number, total: number) => void;
  onReady?: () => void;
  onError?: () => void;
};

export type HeroGlobeHandle = {
  updateConfig: (options: Partial<GlobeConfig>) => void;
  destroy: () => void;
};

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;
const LABEL_MAX_OPACITY = 0.98;
const LABEL_MIN_SPACING_DOT = Math.cos(degreesToRadians(26));
const LABEL_FADE_SECONDS = 0.5;
const LABEL_SELECTION_HYSTERESIS = 0.08;

type GlobeLocationLabel = {
  latitude: number;
  longitude: number;
  code: string;
  details: string[];
  mobileDetails?: string[];
  placement: LocationLabelPlacement;
  selectionBias?: number;
};

const LABEL_LOCATIONS: Omit<GlobeLocationLabel, 'code'>[] = [
  { latitude: -0.7471674, longitude: -90.3134198, details: ['Puerto Ayora', 'Galápagos, Ecuador'], mobileDetails: ['Puerto Ayora', 'Ecuador'], placement: 'southEast' },
  { latitude: 5.442089, longitude: -55.210824, details: ['Hollandse Kamp', 'Zanderij', 'Suriname'], mobileDetails: ['Zanderij', 'Suriname'], placement: 'northWest' },
  { latitude: -3.8537498, longitude: -32.4198018, details: ['Fernando de Noronha', 'Brazil'], mobileDetails: ['Noronha', 'Brazil'], placement: 'southEast' },
  { latitude: 14.9162811, longitude: -23.5095095, details: ['Praia', 'Cabo Verde'], placement: 'northWest' },
  { latitude: 19.5696707, longitude: 5.7725744, details: ['In Guezzam', 'Algeria'], placement: 'northWest', selectionBias: 0.11 },
  { latitude: 6.4300279, longitude: 3.4259904, details: ['Victoria Island', 'Lagos, Nigeria'], mobileDetails: ['Victoria Island', 'Nigeria'], placement: 'southEast' },
  { latitude: 13.6238244, longitude: 25.3555559, details: ['El Fasher', 'North Darfur, Sudan'], mobileDetails: ['El Fasher', 'Sudan'], placement: 'northEast' },
  { latitude: 2.032189, longitude: 45.312983, details: ['Hodan', 'Mogadishu, Somalia'], mobileDetails: ['Hodan', 'Mogadishu, Somalia'], placement: 'southEast' },
  { latitude: 12.277211, longitude: 76.637814, details: ['JP Nagar', 'Mysuru', 'India'], mobileDetails: ['Mysuru', 'India'], placement: 'northWest' },
  { latitude: 10.7703806, longitude: 106.6951066, details: ['Bến Thành', 'Ho Chi Minh City', 'Vietnam'], mobileDetails: ['Bến Thành', 'Vietnam'], placement: 'southEast' },
  { latitude: -5.933265, longitude: 144.889876, details: ['Burba', 'Sim', 'Papua New Guinea'], mobileDetails: ['Burba', 'Papua New Guinea'], placement: 'southWest' },
  { latitude: 1.3490778, longitude: 173.0386512, details: ['South Tarawa', 'Kiribati'], placement: 'northEast' },
  { latitude: 1.872, longitude: -157.3842085, details: ['Kiritimati', 'Kiribati'], placement: 'southWest' },
];

const LOCATION_LABELS: GlobeLocationLabel[] = LABEL_LOCATIONS.map((label) => ({
  ...label,
  code: calculateSixDCode(label.latitude, label.longitude),
}));

function lonLatToSpherePosition(latitude: number, longitude: number, radius: number) {
  const lat = degreesToRadians(latitude);
  const lon = degreesToRadians(longitude + 180);
  const cosLat = Math.cos(lat);

  return {
    x: -radius * Math.cos(lon) * cosLat,
    y: radius * Math.sin(lat),
    z: radius * Math.sin(lon) * cosLat,
  };
}

function canUseWebGL(): boolean {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createCurvedLocationLabel(label: GlobeLocationLabel, texture: Texture, isMobile: boolean): Mesh<BufferGeometry, MeshBasicMaterial> {
  const columns = 28;
  const rows = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const radius = 1.022;
  const { u: markerU, v: markerV } = getLocationLabelMarkerUv(label.placement);
  const longitudeSpan = isMobile ? 42 : 33.2;
  const latitudeSpan = isMobile ? 19 : 15.2;
  const startLongitude = label.longitude - markerU * longitudeSpan;
  const startLatitude = label.latitude + markerV * latitudeSpan;

  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;

    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const longitude = startLongitude + u * longitudeSpan;
      const latitude = startLatitude - v * latitudeSpan;
      const position = lonLatToSpherePosition(latitude, longitude, radius);

      positions.push(position.x, position.y, position.z);
      uvs.push(u, 1 - v);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;

      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false,
    side: DoubleSide,
  });

  return new Mesh(geometry, material);
}

export function createHeroGlobe(options: HeroGlobeOptions): HeroGlobeHandle {
  const config: GlobeConfig = { ...GLOBE_CONFIG, ...options };
  const { container } = options;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = options.reducedMotion ?? reducedMotionQuery.matches;
  let isVisible = document.visibilityState === 'visible';
  let isIntersecting = true;
  let destroyed = false;
  let animationId = 0;
  let width = 1;
  let height = 1;
  let pointerX = 0;
  let pointerY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;

  if (!canUseWebGL()) {
    options.onError?.();
    return {
      updateConfig: () => undefined,
      destroy: () => undefined,
    };
  }

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', 'Rotating digital globe showing Africa, the Middle East and Asia');
  renderer.domElement.setAttribute('role', 'img');
  container.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 5.8);

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const segments = isMobile ? config.mobileSegments : config.desktopSegments;
  const textureLoadTotal = 3;
  let loadedTextureCount = 0;
  let texturesReady = false;
  let readyReported = false;
  let loadFailed = false;
  const markTextureReady = (success: boolean) => {
    if (destroyed || loadFailed) return;
    // The scene remains hidden until all textures and the first frame are ready.
    if (!success && options.onError) {
      loadFailed = true;
      options.onError();
      return;
    }
    loadedTextureCount += 1;
    options.onProgress?.(loadedTextureCount, textureLoadTotal);
    texturesReady = loadedTextureCount === textureLoadTotal;
    requestRender();
  };
  const reportReadyAfterRender = () => {
    if (!texturesReady || readyReported) return;
    readyReported = true;
    options.onReady?.();
  };
  options.onProgress?.(0, textureLoadTotal);
  const surfaceTexture = createSurfaceTexture(isMobile, markTextureReady);
  const cityLightsTexture = createCityLightsTexture(isMobile, markTextureReady);
  const countryBordersTexture = createCountryBordersTexture(isMobile, markTextureReady);
  const limbGlowTexture = createLimbGlowTexture();
  const locationLabelTextures = LOCATION_LABELS.map((label) => createLocationLabelTexture(label, label.placement, isMobile));
  const globeGeometry = new SphereGeometry(1, segments, Math.floor(segments / 2));
  const cityLightsGeometry = new SphereGeometry(1.004, segments, Math.floor(segments / 2));
  const countryBordersGeometry = new SphereGeometry(1.006, segments, Math.floor(segments / 2));
  const atmosphereRimGeometry = new SphereGeometry(1.012, segments, Math.floor(segments / 2));
  const atmosphereHaloGeometry = new SphereGeometry(1.04, segments, Math.floor(segments / 2));
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  surfaceTexture.anisotropy = anisotropy;
  cityLightsTexture.anisotropy = anisotropy;
  const surfaceMaterial = createSurfaceMaterial(surfaceTexture);
  const cityLightsMaterial = createCityLightsMaterial(cityLightsTexture);
  const countryBordersMaterial = createGridMaterial(countryBordersTexture, config.gridOpacity);
  const limbGlowMaterial = createLimbGlowMaterial(limbGlowTexture, config.atmosphereIntensity);
  const atmosphereRimMaterial = createAtmosphereRimMaterial(config.atmosphereIntensity);
  const atmosphereHaloMaterial = createAtmosphereRimMaterial(config.atmosphereIntensity, true);

  const globeGroup = new Group();
  const spinningGroup = new Group();
  const surface = new Mesh(globeGeometry, surfaceMaterial);
  const cityLights = new Mesh(cityLightsGeometry, cityLightsMaterial);
  const countryBorders = new Mesh(countryBordersGeometry, countryBordersMaterial);
  const atmosphereRim = new Mesh(atmosphereRimGeometry, atmosphereRimMaterial);
  const atmosphereHalo = new Mesh(atmosphereHaloGeometry, atmosphereHaloMaterial);
  const locationLabels = LOCATION_LABELS.map((label, index) => ({
    mesh: createCurvedLocationLabel(label, locationLabelTextures[index], isMobile),
    anchor: new Vector3(...Object.values(lonLatToSpherePosition(label.latitude, label.longitude, 1))),
    opacity: 0,
    selected: false,
    selectionBias: label.selectionBias,
  }));
  const limbGlow = new Sprite(limbGlowMaterial);
  // Keep the sun in the camera-facing tangent plane at the upper-right limb.
  // This group never spins with the Earth or its geographic labels.
  limbGlow.scale.set(1.35, 1.35, 1);
  spinningGroup.add(surface, cityLights, countryBorders, ...locationLabels.map((label) => label.mesh));
  globeGroup.add(limbGlow, spinningGroup, atmosphereRim, atmosphereHalo);
  scene.add(globeGroup);

  // Seeded, static stars remain inexpensive and respect reduced motion.
  const starPositions: number[] = [];
  let seed = 617;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let index = 0; index < (isMobile ? 180 : 750); index += 1) {
    starPositions.push((random() - 0.5) * 19, (random() - 0.5) * 10, -5 - random() * 3);
  }
  const starsGeometry = new BufferGeometry();
  starsGeometry.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
  const starsMaterial = new PointsMaterial({ color: 0x74b6ff, size: 0.013, transparent: true, opacity: 0.52, depthWrite: false });
  scene.add(new Points(starsGeometry, starsMaterial));

  scene.add(new AmbientLight(0x9abbff, 1.1));
  const keyLight = new DirectionalLight(0xc6e6ff, 2);
  keyLight.position.set(3.5, 4, 1.8);
  scene.add(keyLight);

  let lastFrame = performance.now();
  let rotationElapsed = 0;
  const pointerEnabled = !isMobile && !reducedMotion && matchMedia('(pointer: fine)').matches;

  function applyResponsiveLayout() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.maxPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const shortest = Math.min(width, height);
    const stackedLayout = width <= 860;
    const responsiveScale = stackedLayout ? 0.43 : width < 1024 ? 1.18 : 1.45;
    if (options.layout === 'centered') {
      const fitScale = camera.position.z * Math.sin(degreesToRadians(camera.fov / 2))
        * Math.min(1, camera.aspect) * 0.86;
      const desktopScale = window.matchMedia('(min-width: 721px)').matches ? options.desktopGlobeScale ?? 1 : 1;
      globeGroup.scale.setScalar(config.globeScale * fitScale * desktopScale);
      globeGroup.position.set(0, 0, 0);
    } else {
      globeGroup.scale.setScalar(config.globeScale * responsiveScale);
      globeGroup.position.x = stackedLayout ? 0.22 : config.horizontalOffset * (width / shortest);
      globeGroup.position.y = stackedLayout ? 1 : -0.02;
    }
    const viewDirection = camera.position.clone().sub(globeGroup.position).normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), viewDirection).normalize();
    const up = new Vector3().crossVectors(viewDirection, right).normalize();
    limbGlow.position.copy(right.multiplyScalar(0.64)).add(up.multiplyScalar(0.74)).addScaledVector(viewDirection, 0.25);
    requestRender();
  }

  function applyOrientation(elapsedSeconds: number) {
    const rotationSpeed = (Math.PI * 2) / Math.max(1, config.rotationDuration);
    const autoRotation = elapsedSeconds * rotationSpeed;
    spinningGroup.rotation.y = degreesToRadians(config.initialLongitude) + autoRotation;
  }

  function requestRender() {
    if (destroyed || loadFailed || !texturesReady || !isVisible || !isIntersecting || animationId) return;
    lastFrame = performance.now();
    animationId = window.requestAnimationFrame(render);
  }

  function render() {
    animationId = 0;
    if (destroyed || loadFailed || !texturesReady || !isVisible || !isIntersecting) return;
    const moving = !reducedMotion && options.autoRotate !== false;

    const now = performance.now();
    const elapsedSeconds = Math.min(now - lastFrame, 100) / 1000;
    if (moving) rotationElapsed += elapsedSeconds;
    lastFrame = now;
    if (isVisible && isIntersecting) {
      applyOrientation(rotationElapsed);

      const maxTilt = degreesToRadians(config.pointerTiltDegrees);
      currentTiltX += (pointerY * maxTilt - currentTiltX) * (moving ? 0.07 : 1);
      currentTiltY += (pointerX * maxTilt - currentTiltY) * (moving ? 0.07 : 1);
      globeGroup.rotation.x = currentTiltX;
      globeGroup.rotation.y = currentTiltY;
      const facingLabels = locationLabels.map((label) => {
        const visibleAnchor = label.anchor.clone().applyEuler(spinningGroup.rotation).applyEuler(globeGroup.rotation);
        const viewDirection = camera.position.clone().sub(globeGroup.position)
          .addScaledVector(visibleAnchor, -globeGroup.scale.x).normalize();
        return { label, frontness: visibleAnchor.dot(viewDirection) };
      });
      const candidates = facingLabels.filter(({ frontness }) => frontness > 0)
        .sort((a, b) => (b.frontness + (b.label.selected ? LABEL_SELECTION_HYSTERESIS : 0) + (b.label.selectionBias ?? 0))
          - (a.frontness + (a.label.selected ? LABEL_SELECTION_HYSTERESIS : 0) + (a.label.selectionBias ?? 0)));
      const selected: typeof candidates = [];
      // Prefer three well-separated labels on the visible side of the globe.
      for (const candidate of candidates) {
        if (selected.every(({ label }) => candidate.label.anchor.dot(label.anchor) < LABEL_MIN_SPACING_DOT)) selected.push(candidate);
        if (selected.length === 3) break;
      }
      for (const candidate of candidates) {
        if (selected.length === 3) break;
        if (!selected.includes(candidate)) selected.push(candidate);
      }
      const fadeFactor = 1 - Math.exp(-elapsedSeconds / LABEL_FADE_SECONDS);
      facingLabels.forEach(({ label, frontness }) => {
        label.selected = selected.some(({ label: chosen }) => chosen === label);
        const targetOpacity = label.selected
          ? LABEL_MAX_OPACITY * smoothstep(0.08, 0.55, frontness)
          : 0;
        label.opacity = !moving || !readyReported ? targetOpacity : label.opacity + (targetOpacity - label.opacity) * fadeFactor;
        label.mesh.material.opacity = label.opacity;
        label.mesh.visible = label.opacity > 0.02;
      });

      renderer.render(scene, camera);
      reportReadyAfterRender();
    }

    if (moving) animationId = window.requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(applyResponsiveLayout);
  resizeObserver.observe(container);
  applyResponsiveLayout();
  applyOrientation(0);

  const intersectionObserver = new IntersectionObserver((entries) => {
    isIntersecting = entries.some((entry) => entry.isIntersecting);
    requestRender();
  });
  intersectionObserver.observe(container);

  function handleVisibilityChange() {
    isVisible = document.visibilityState === 'visible';
    requestRender();
  }

  function handleMotionChange(event: MediaQueryListEvent) {
    reducedMotion = options.reducedMotion ?? event.matches;
    if (reducedMotion) {
      pointerX = 0;
      pointerY = 0;
    }
    requestRender();
  }

  function handlePointerMove(event: PointerEvent) {
    if (!pointerEnabled || reducedMotion) return;
    pointerX = (event.clientX / width - 0.5) * 2;
    pointerY = -(event.clientY / height - 0.5) * 2;
    requestRender();
  }

  function handlePointerLeave() {
    pointerX = 0;
    pointerY = 0;
    requestRender();
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  reducedMotionQuery.addEventListener('change', handleMotionChange);
  container.addEventListener('pointermove', handlePointerMove);
  container.addEventListener('pointerleave', handlePointerLeave);
  requestRender();

  return {
    updateConfig(nextOptions) {
      Object.assign(config, nextOptions);
      countryBordersMaterial.opacity = config.gridOpacity;
      limbGlowMaterial.opacity = Math.min(1, Math.max(0, config.atmosphereIntensity));
      atmosphereRimMaterial.uniforms.opacity.value = Math.max(0, config.atmosphereIntensity);
      atmosphereHaloMaterial.uniforms.opacity.value = Math.max(0, config.atmosphereIntensity);
      applyResponsiveLayout();
      requestRender();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reducedMotionQuery.removeEventListener('change', handleMotionChange);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      globeGeometry.dispose();
      cityLightsGeometry.dispose();
      countryBordersGeometry.dispose();
      atmosphereRimGeometry.dispose();
      atmosphereHaloGeometry.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      surfaceTexture.dispose();
      cityLightsTexture.dispose();
      countryBordersTexture.dispose();
      limbGlowTexture.dispose();
      locationLabelTextures.forEach((texture) => texture.dispose());
      locationLabels.forEach((label) => label.mesh.geometry.dispose());
      surfaceMaterial.dispose();
      cityLightsMaterial.dispose();
      countryBordersMaterial.dispose();
      limbGlowMaterial.dispose();
      atmosphereRimMaterial.dispose();
      atmosphereHaloMaterial.dispose();
      locationLabels.forEach((label) => {
        if (Array.isArray(label.mesh.material)) {
          label.mesh.material.forEach((material) => material.dispose());
        } else {
          label.mesh.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
