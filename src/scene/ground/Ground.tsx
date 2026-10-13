// The ground: night, faintly lit from below where memories cluster, with the thin elliptical rings the
// screens show under each group (p1, p3). Living clusters light the ground; fading ones barely do.

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { flowerColor, TOKENS } from '../../engine';
import { useGarden } from '../../store/garden';
import { clustersOf } from '../clusters';
import { damp } from '../motion';
import { useLayout } from '../useLayout';

const MAX_SPOTS = 32;

const vertexShader = /* glsl */ `
varying vec2 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const fragmentShader = /* glsl */ `
#define MAX_SPOTS ${MAX_SPOTS}
uniform vec3 uNight, uGround, uLift;
uniform vec4 uSpots[MAX_SPOTS]; // x, z, radius, strength
uniform vec3 uSpotColor[MAX_SPOTS]; // each cluster's light: its living flowers' colours, half fog (D26)
uniform int uCount;
varying vec2 vWorld;
void main() {
  vec3 col = uGround;
  vec3 glow = vec3(0.0);
  for (int i = 0; i < MAX_SPOTS; i++) {
    if (i >= uCount) break;
    vec4 s = uSpots[i];
    // Ellipses stretched along x, like the rings in the screens.
    vec2 d = (vWorld - s.xy) / vec2(1.0, 0.62);
    float r = length(d);
    float lift = s.w * exp(-(r * r) / (s.z * s.z * 0.8));
    float ring = s.w * exp(-pow((r - s.z) / 0.035, 2.0)) * 0.5 + s.w * exp(-pow((r - s.z * 0.62) / 0.03, 2.0)) * 0.3;
    glow += uSpotColor[i] * (lift * 0.06 + ring * 0.035);
  }
  col += glow;
  // The ground nearest the viewer lifts toward fog: 5% in linear light at the bottom of the home frame (z ≈ 6), which
  // reads about #1c2026, like screens p3. The garden stands on a faint slate floor instead of floating in black.
  col = mix(col, uLift, smoothstep(0.5, 6.0, vWorld.y) * 0.05);
  // The garden dissolves into night toward the edges.
  float far = smoothstep(9.0, 24.0, length(vWorld * vec2(0.8, 1.0)));
  gl_FragColor = vec4(mix(col, uNight, far), 1.0);
  #include <colorspace_fragment>
}`;

export function Ground() {
  const layout = useLayout();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uNight: { value: new THREE.Color(TOKENS.night) },
      uGround: { value: new THREE.Color('#0d1119') },
      uLift: { value: new THREE.Color(TOKENS.fog) },
      uSpots: { value: Array.from({ length: MAX_SPOTS }, () => new THREE.Vector4()) },
      uSpotColor: { value: Array.from({ length: MAX_SPOTS }, () => new THREE.Color(TOKENS.fog)) },
      uCount: { value: 0 },
    },
    vertexShader, fragmentShader,
  }), []);

  // Clusters change only when the garden or views change; strengths ease over ~3s each frame.
  const garden = useGarden((s) => s.garden);
  const shown = useGarden((s) => s.shown);
  const clusters = useMemo(() => clustersOf(garden, shown, layout).slice(0, MAX_SPOTS), [garden, shown, layout]);
  // Each cluster's light is the colour of what lives in it: its flowers' colours weighted by vitality, half fog, so
  // a living group glows in its own hues and a faded one goes back to grey (D26).
  const tints = useMemo(() => clusters.map((c) => {
    const sum = new THREE.Color(0, 0, 0), one = new THREE.Color();
    let w = 0;
    for (const id of c.ids) {
      const m = garden.memories[id], v = shown[id];
      if (!m || !v || m.lost) continue;
      sum.add(one.set(flowerColor(m.kind, v.state, m.hue)).multiplyScalar(v.vitality));
      w += v.vitality;
    }
    const fog = new THREE.Color(TOKENS.fog);
    return w > 0 ? sum.multiplyScalar(1 / w).lerp(fog, 0.5) : fog;
  }), [clusters, garden, shown]);

  useFrame((_, dt) => {
    const spots = mat.uniforms.uSpots.value as THREE.Vector4[];
    const k = damp(1.2, dt);
    const colors = mat.uniforms.uSpotColor.value as THREE.Color[];
    clusters.forEach((c, i) => {
      if (mat.uniforms.uCount.value <= i) colors[i].copy(tints[i]);
      colors[i].lerp(tints[i], k);
      const s = spots[i];
      if (mat.uniforms.uCount.value <= i) s.set(c.x, c.z, c.radius, 0);
      s.x = c.x; s.y = c.z; s.z += (c.radius - s.z) * k;
      s.w += (c.vitality - s.w) * k;
    });
    mat.uniforms.uCount.value = clusters.length;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.001} material={mat}>
      <planeGeometry args={[60, 60]} />
    </mesh>
  );
}
