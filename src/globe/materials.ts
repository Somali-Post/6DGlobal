import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshPhongMaterial,
  SpriteMaterial,
  Texture,
} from 'three';

export function createSurfaceMaterial(surfaceTexture: Texture): MeshPhongMaterial {
  return new MeshPhongMaterial({
    color: new Color('#ffffff'),
    map: surfaceTexture,
    emissive: new Color('#061a2e'),
    emissiveIntensity: 0.26,
    shininess: 6,
    specular: new Color('#0f4b75'),
  });
}

export function createGridMaterial(gridTexture: Texture, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: gridTexture,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function createCityLightsMaterial(lightTexture: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: lightTexture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function createSunGlowMaterial(glowTexture: Texture, intensity: number): SpriteMaterial {
  return new SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: Math.min(1, Math.max(0, intensity * 0.88)),
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
}
