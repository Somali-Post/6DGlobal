import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshPhongMaterial,
  ShaderMaterial,
  SpriteMaterial,
  Texture,
} from 'three';

export function createSurfaceMaterial(surfaceTexture: Texture): MeshPhongMaterial {
  return new MeshPhongMaterial({
    color: new Color('#8faccc'),
    map: surfaceTexture,
    emissive: new Color('#010711'),
    emissiveIntensity: 0.06,
    shininess: 2,
    specular: new Color('#00040a'),
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
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function createLimbGlowMaterial(glowTexture: Texture, intensity: number): SpriteMaterial {
  return new SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: Math.min(0.58, Math.max(0, intensity * 0.52)),
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  });
}

export function createAtmosphereRimMaterial(intensity: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      rimColor: { value: new Color('#58bdff') },
      opacity: { value: Math.min(0.42, Math.max(0, intensity * 0.4)) },
    },
    vertexShader: `
      varying vec3 vViewNormal;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 rimColor;
      uniform float opacity;
      varying vec3 vViewNormal;

      void main() {
        float edge = pow(1.0 - abs(vViewNormal.z), 2.55);
        float openSide = smoothstep(-0.12, 0.7, vViewNormal.x);
        float verticalFalloff = smoothstep(-0.9, -0.08, vViewNormal.y) * smoothstep(1.02, 0.12, vViewNormal.y);
        float alpha = edge * openSide * verticalFalloff * opacity;
        gl_FragColor = vec4(rimColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  });
}
