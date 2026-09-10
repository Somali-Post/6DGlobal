import {
  AdditiveBlending,
  BackSide,
  Color,
  MeshBasicMaterial,
  MeshPhongMaterial,
  ShaderMaterial,
  SpriteMaterial,
  Texture,
} from 'three';

export function createSurfaceMaterial(surfaceTexture: Texture): MeshPhongMaterial {
  return new MeshPhongMaterial({
    color: new Color('#ffffff'),
    map: surfaceTexture,
    bumpMap: surfaceTexture,
    bumpScale: 0.018,
    emissive: new Color('#173361'),
    emissiveMap: surfaceTexture,
    emissiveIntensity: 0.35,
    shininess: 8,
    specular: new Color('#070e1b'),
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
    opacity: 1,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function createLimbGlowMaterial(glowTexture: Texture, intensity: number): SpriteMaterial {
  return new SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: Math.min(1, Math.max(0, intensity)),
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  });
}

export function createAtmosphereRimMaterial(intensity: number, outer = false): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      rimColor: { value: new Color(outer ? '#087bff' : '#54bcff') },
      opacity: { value: Math.max(0, intensity) },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vViewPosition;

      void main() {
        vViewNormal = normalize(normalMatrix * normal);
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 rimColor;
      uniform float opacity;
      varying vec3 vViewNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 normal = normalize(vViewNormal);
        float facing = abs(dot(normal, normalize(-vViewPosition)));
        float sunward = smoothstep(-0.8, 0.95, dot(normal, normalize(vec3(0.65, 0.75, 0.2))));
        float edge = ${outer ? 'smoothstep(0.0, 0.32, facing) * 0.48' : 'pow(1.0 - facing, 3.8)'};
        float alpha = edge * (0.32 + sunward * 0.95) * opacity;
        gl_FragColor = vec4(mix(rimColor, vec3(0.48, 0.8, 1.0), sunward * 0.35), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    ...(outer ? { side: BackSide } : {}),
  });
}
