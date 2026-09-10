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
  autoRotate?: boolean;
  reducedMotion?: boolean;
  onProgress?: (loaded: number, total: number) => void;
  onReady?: () => void;
};

export type HeroGlobeHandle = {
  updateConfig: (options: Partial<GlobeConfig>) => void;
  destroy: () => void;
};

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;
const LABEL_FADE_START = 0.66;
const LABEL_FADE_END = 0.86;
const LABEL_MAX_OPACITY = 0.98;
const LABEL_VISIBLE_THRESHOLD = 0.08;

type GlobeLocationLabel = {
  latitude: number;
  longitude: number;
  code: string;
  details: string[];
  placement: LocationLabelPlacement;
};

const LOCATION_LABELS: GlobeLocationLabel[] = [
  { latitude: 2.032189, longitude: 45.312983, code: '31-22-19', details: ['Hodan, Mogadishu', 'Somalia'], placement: 'southEast' },
  { latitude: -17.863955, longitude: -63.230619, code: '63-30-96', details: ['Urbanizacion La Mar', 'Municipio La Guardia', 'Bolivia'], placement: 'west' },
  { latitude: 5.442089, longitude: -55.210824, code: '41-20-08', details: ['Hollandse Kamp', 'Zanderij', 'Suriname'], placement: 'southEast' },
  { latitude: 10.083832, longitude: -83.3448, code: '84-34-88', details: ['La Zonita', 'Batan', 'Costa Rica'], placement: 'west' },
  { latitude: -19.253986, longitude: 140.348779, code: '54-38-97', details: ['Four Ways', 'Queensland', 'Australia'], placement: 'east' },
  { latitude: -5.933265, longitude: 144.889876, code: '38-39-28', details: ['Burba', 'Sim', 'Papua New Guinea'], placement: 'east' },
  { latitude: 12.277211, longitude: 76.637814, code: '73-77-28', details: ['JP Nagar', 'Mysuru', 'India'], placement: 'northEast' },
  { latitude: 26.932701, longitude: 64.078386, code: '37-28-73', details: ['Panjgur District', 'Balochistan', 'Pakistan'], placement: 'northWest' },
  { latitude: -14.84562, longitude: 24.814683, code: '41-54-66', details: ['Kaoma District', 'Western Province', 'Zambia'], placement: 'southWest' },
  { latitude: 7.879227, longitude: -11.343555, code: '74-93-25', details: ['Blama', 'Kenema District', 'Sierra Leone'], placement: 'northWest' },
  { latitude: 40.724661, longitude: -74.000804, code: '20-40-68', details: ['University Village', 'New York', 'United States'], placement: 'east' },
  { latitude: 62.521117, longitude: -42.241282, code: '24-11-12', details: ['Kujalleq', 'Greenland'], placement: 'southEast' },
  { latitude: 20.563046, longitude: -156.599767, code: '69-39-07', details: ['Maui County', 'Hawaii', 'United States'], placement: 'east' },
];

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

function createCurvedLocationLabel(label: GlobeLocationLabel, texture: Texture): Mesh<BufferGeometry, MeshBasicMaterial> {
  const columns = 28;
  const rows = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const radius = 1.022;
  const { u: markerU, v: markerV } = getLocationLabelMarkerUv(label.placement);
  const longitudeSpan = 33.2;
  const latitudeSpan = 15.2;
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
  const markTextureReady = () => {
    loadedTextureCount += 1;
    options.onProgress?.(loadedTextureCount, textureLoadTotal);
    texturesReady = loadedTextureCount === textureLoadTotal;
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
  const locationLabelTextures = LOCATION_LABELS.map((label) => createLocationLabelTexture(label, label.placement));
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
    mesh: createCurvedLocationLabel(label, locationLabelTextures[index]),
    anchor: new Vector3(...Object.values(lonLatToSpherePosition(label.latitude, label.longitude, 1))),
    opacity: 0,
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

  const startTime = performance.now();
  let hiddenAt = 0;
  let hiddenDuration = 0;
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
    globeGroup.scale.setScalar(config.globeScale * responsiveScale);
    globeGroup.position.x = stackedLayout ? 0.22 : config.horizontalOffset * (width / shortest);
    globeGroup.position.y = stackedLayout ? 1 : -0.02;
    const viewDirection = camera.position.clone().sub(globeGroup.position).normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), viewDirection).normalize();
    const up = new Vector3().crossVectors(viewDirection, right).normalize();
    limbGlow.position.copy(right.multiplyScalar(0.64)).add(up.multiplyScalar(0.74)).addScaledVector(viewDirection, 0.25);
  }

  function applyOrientation(elapsedSeconds: number) {
    const rotationSpeed = (Math.PI * 2) / Math.max(1, config.rotationDuration);
    const autoRotation = options.autoRotate === false || reducedMotion ? 0 : elapsedSeconds * rotationSpeed;
    spinningGroup.rotation.y = degreesToRadians(config.initialLongitude) + autoRotation;
  }

  function render() {
    if (destroyed) return;

    if (isVisible && isIntersecting) {
      const elapsed = (performance.now() - startTime - hiddenDuration) / 1000;
      applyOrientation(elapsed);

      const maxTilt = degreesToRadians(config.pointerTiltDegrees);
      currentTiltX += (pointerY * maxTilt - currentTiltX) * 0.07;
      currentTiltY += (pointerX * maxTilt - currentTiltY) * 0.07;
      globeGroup.rotation.x = currentTiltX;
      globeGroup.rotation.y = currentTiltY;
      locationLabels.forEach((label) => {
        const visibleAnchor = label.anchor.clone().applyEuler(spinningGroup.rotation).applyEuler(globeGroup.rotation);
        // Perspective matters on an offset globe: fade against the actual
        // anchor-to-camera direction before cards become edge-on or occluded.
        const viewDirection = camera.position.clone().sub(globeGroup.position)
          .addScaledVector(visibleAnchor, -globeGroup.scale.x).normalize();
        const targetOpacity = smoothstep(LABEL_FADE_START, LABEL_FADE_END, visibleAnchor.dot(viewDirection)) * LABEL_MAX_OPACITY;
        label.opacity += (targetOpacity - label.opacity) * 0.08;
        label.mesh.material.opacity = label.opacity;
        label.mesh.visible = targetOpacity > LABEL_VISIBLE_THRESHOLD && label.opacity > 0.04;
      });

      renderer.render(scene, camera);
      reportReadyAfterRender();
    }

    animationId = window.requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(applyResponsiveLayout);
  resizeObserver.observe(container);
  applyResponsiveLayout();
  applyOrientation(0);
  renderer.render(scene, camera);

  const intersectionObserver = new IntersectionObserver((entries) => {
    isIntersecting = entries.some((entry) => entry.isIntersecting);
  });
  intersectionObserver.observe(container);

  function handleVisibilityChange() {
    isVisible = document.visibilityState === 'visible';
    if (isVisible && hiddenAt > 0) {
      hiddenDuration += performance.now() - hiddenAt;
      hiddenAt = 0;
    } else if (!isVisible) {
      hiddenAt = performance.now();
    }
  }

  function handleMotionChange(event: MediaQueryListEvent) {
    reducedMotion = options.reducedMotion ?? event.matches;
    if (reducedMotion) {
      pointerX = 0;
      pointerY = 0;
      applyOrientation(0);
      renderer.render(scene, camera);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!pointerEnabled) return;
    pointerX = (event.clientX / width - 0.5) * 2;
    pointerY = -(event.clientY / height - 0.5) * 2;
  }

  function handlePointerLeave() {
    pointerX = 0;
    pointerY = 0;
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  reducedMotionQuery.addEventListener('change', handleMotionChange);
  container.addEventListener('pointermove', handlePointerMove);
  container.addEventListener('pointerleave', handlePointerLeave);
  animationId = window.requestAnimationFrame(render);

  return {
    updateConfig(nextOptions) {
      Object.assign(config, nextOptions);
      countryBordersMaterial.opacity = config.gridOpacity;
      limbGlowMaterial.opacity = Math.min(1, Math.max(0, config.atmosphereIntensity));
      atmosphereRimMaterial.uniforms.opacity.value = Math.max(0, config.atmosphereIntensity);
      atmosphereHaloMaterial.uniforms.opacity.value = Math.max(0, config.atmosphereIntensity);
      applyResponsiveLayout();
      applyOrientation(reducedMotion ? 0 : (performance.now() - startTime - hiddenDuration) / 1000);
      renderer.render(scene, camera);
    },
    destroy() {
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
