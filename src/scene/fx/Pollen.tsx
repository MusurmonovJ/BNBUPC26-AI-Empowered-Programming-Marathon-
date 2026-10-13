// Pollen (D26): "colour is life" made visible. Every living flower lets a few motes of its own colour rise from its
// head, slowly, and fade as they go: a vivid memory seven, a fading one three, a ghost none. When a season passes,
// the colour leaves with what is forgotten. One point cloud for the whole garden, additive, drawn in a single call.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { flowerColor, hashSeed, rng } from '../../engine';
import { useGarden } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { damp, useReducedMotion } from '../motion';
import { useLayout } from '../useLayout';

/** Motes per flower by state, and how much light each carries. */
const PER_STATE = { vivid: 7, fading: 3, ghost: 0, lost: 0 } as const;
const ALPHA = { vivid: 0.55, fading: 0.3, ghost: 0, lost: 0 } as const;
/** Each mote rises this far (world units) over its 7–11s life, drifting a little sideways. */
const RISE = 1.1;
/** While a memory is open or the reveal is up, the pollen steps back with the rest of the garden. */
const DIMMED = 0.35;

const shader = {
  vertexShader: /* glsl */ `
    attribute vec3 aColor;
    attribute vec4 aLife; // phase, period (s), drift x, drift z
    attribute float aAlpha;
    uniform float uTime, uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float t = fract(uTime / aLife.y + aLife.x);
      vec3 p = position + vec3(sin(t * 3.0 + aLife.x * 6.28) * aLife.z, ${RISE.toFixed(2)} * t, cos(t * 2.0 + aLife.x * 4.0) * aLife.w);
      vColor = aColor;
      // Rises out of the flower, brightest a third of the way up, gone before it leaves the garden.
      vAlpha = aAlpha * smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.45, 1.0, t));
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = 2.6 * uPixelRatio * (11.5 / -mv.z);
    }`,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float a = vAlpha * uOpacity * pow(max(0.0, 1.0 - d), 1.6);
      if (a <= 0.002) discard;
      gl_FragColor = vec4(vColor * 1.6, a);
      #include <colorspace_fragment>
    }`,
};

export function Pollen() {
  const garden = useGarden((s) => s.garden);
  // A season's replay updates `shown` every tick; the pollen only cares when a memory's state changes.
  const states = useGarden((s) => Object.entries(s.shown).map(([id, v]) => id + v.state).join());
  const layout = useLayout();
  const reduced = useReducedMotion();
  const dpr = useThree((s) => s.viewport.dpr);

  // Rebuilt only when a state changes: a planting, a fading, a loss. A few hundred points at most.
  const geometry = useMemo(() => {
    const shown = useGarden.getState().shown;
    const pos: number[] = [], col: number[] = [], life: number[] = [], alpha: number[] = [];
    const c = new THREE.Color();
    for (const m of Object.values(garden.memories)) {
      const v = shown[m.id], L = layout[m.id];
      if (!v || !L || m.lost) continue;
      const n = PER_STATE[v.state];
      if (!n) continue;
      const head = flowerHead(m.kind, m.id, L.size, baseToWorld(L.x, L.y));
      c.set(flowerColor(m.kind, v.state, m.hue));
      const r = rng(`pollen:${m.id}`);
      for (let i = 0; i < n; i++) {
        pos.push(head.x + (r() - 0.5) * 0.3, head.y + (r() - 0.5) * 0.2, head.z + (r() - 0.5) * 0.2);
        col.push(c.r, c.g, c.b);
        life.push(r(), 7 + r() * 4, 0.08 + r() * 0.14, 0.05 + r() * 0.1);
        alpha.push(ALPHA[v.state] * (0.6 + 0.4 * r()));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aLife', new THREE.Float32BufferAttribute(life, 4));
    g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alpha, 1));
    return g;
  }, [garden, states, layout]); // `states` stands for `shown`
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    ...shader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 } },
  }), []);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }, dt) => {
    const s = useGarden.getState();
    const want = s.focusedId || s.reveal.open || s.presentation.holderId ? DIMMED : 1;
    const u = material.uniforms;
    u.uOpacity.value += (want - u.uOpacity.value) * damp(2, dt);
    u.uTime.value = clock.elapsedTime + (hashSeed('pollen') % 100);
    u.uPixelRatio.value = dpr;
  });

  // Reduced motion: no drifting particles at all; the flowers' own colour still tells their life.
  if (reduced) return null;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
