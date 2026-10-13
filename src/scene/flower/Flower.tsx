// One memory's flower in 3D: the design-system Bloom, grown from its seed, standing on the ground and
// turning to face the camera around its own stem. Its state eases in over ~3s, like dusk falling.

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { flowerColor, hashSeed, mixOklab, TOKENS, type Kind, type MemoryState } from '../../engine';
import { warming } from '../../store/sceneReady';
import { BloomGrowth } from '../fx/BloomGrowth';
import { DarkSeed } from '../fx/DarkSeed';
import { ALIVE, dissolveBeats } from '../fx/dissolveTimeline';
import { bloomBeats } from '../fx/bloomTimeline';
import { damp, useReducedMotion } from '../motion';
import { generateFlower } from './generator';
import { flowerGeometry } from './geometry';
import { makeMaterials, makeUniforms } from './materials';

/** Uniform targets per state (scene-spec § Flowers). */
export const STATE_STYLE: Record<MemoryState, {
  fill: number; leafFill: number; solid: number; outline: number; lineOp: number; glow: number; halo: number;
  motes: number; droop: number; sway: number;
}> = {
  vivid: { fill: 0.62, leafFill: 0.35, solid: 1, outline: 0, lineOp: 0.4, glow: 1, halo: 0.5, motes: 0, droop: 0, sway: 0.012 },
  fading: { fill: 0.34, leafFill: 0.35, solid: 0.75, outline: 0, lineOp: 0.4, glow: 0.45, halo: 0.2, motes: 0, droop: 0.03, sway: 0.012 },
  ghost: { fill: 0, leafFill: 0, solid: 0, outline: 1, lineOp: 0.4, glow: 0, halo: 0, motes: 0, droop: 0.07, sway: 0.008 },
  lost: { fill: 0, leafFill: 0, solid: 0, outline: 1, lineOp: 0.12, glow: 0, halo: 0, motes: 1, droop: 0.07, sway: 0 },
};

export type FlowerProps = {
  kind: Kind;
  /** The memory's id. Never re-seed a memory. */
  seed: string;
  /** Photo flowers: the photo's dominant colour. */
  hue?: string;
  /** Design px: the drawing is size wide and 1.5 × size tall. */
  size: number;
  state: MemoryState;
  /** Where the flower meets the ground, in world units. */
  position: THREE.Vector3 | [number, number, number];
  /** 0–1, for dimming everything but what is held (reveal) or hovered threads. */
  dim?: number;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  /** performance.now() when this flower was last tended or reached by a ripple: it swells with light for ~2s. */
  swellAt?: number;
  /** performance.now() when this flower was planted (or returned to): it grows through the bloom. */
  bornAt?: number;
  /** Hold the bloom at this many ms (the bloom sandbox's storyboard frames). Overrides bornAt. */
  bloomAge?: number;
  /** performance.now() when this memory started to dissolve (may be in the future: the return replay staggers them). */
  diedAt?: number;
  /** Hold the dissolve at this many ms (the dissolve sandbox's storyboard frames). Overrides diedAt. */
  dissolveAge?: number;
};

/** Below this alpha a part of the flower is not drawn. */
const INVISIBLE = 0.002;

/** Tending's swell: light rises over 0.4s, then settles back over 1.6s. Returns 0–1. */
export function swellAmount(sinceMs: number): number {
  const t = sinceMs / 1000;
  if (t < 0) return 0;
  if (t < 0.4) return Math.sin((t / 0.4) * Math.PI / 2);
  return Math.max(0, 1 - (t - 0.4) / 1.6) ** 2;
}

export function Flower({ kind, seed, hue, size, state, position, dim = 1, onPointerOver, onPointerOut, onClick, swellAt, bornAt, bloomAge, diedAt, dissolveAge }: FlowerProps) {
  const data = generateFlower(kind, seed, size);
  const geo = flowerGeometry(data);
  const uniforms = useMemo(() => makeUniforms(geo.height, new THREE.Vector2(geo.head.x, geo.head.y)), [geo]);
  const mats = useMemo(() => makeMaterials(uniforms), [uniforms]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const fill = useRef<THREE.Mesh>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const motes = useRef<THREE.Points>(null);
  const first = useRef(true);
  /** Clock time this flower began to look like a ghost: its petals start to fall from then (null while alive). */
  const ghostSince = useRef<number | null>(null);
  const droop = useRef(0);
  /** Glow and halo eased toward the state's targets; the tend swell is added on top each frame. */
  const lit = useRef({ glow: 0, halo: 0 });
  const reduced = useReducedMotion();
  const dpr = useThree((s) => s.viewport.dpr);
  const phase = useMemo(() => (hashSeed(seed) % 1000) / 1000 * Math.PI * 2, [seed]);
  // Each ghost lets its first petal go after its own 4–12s, so no two fall in step.
  useEffect(() => { uniforms.uFallFirst.value = 4 + (hashSeed(`fall:${seed}`) % 800) / 100; }, [uniforms, seed]);

  const styleOf = (st: MemoryState) => {
    const color = flowerColor(kind, st, hue);
    return {
      ...STATE_STYLE[st],
      color: new THREE.Color(color),
      stem: new THREE.Color(st === 'lost' ? TOKENS.fog : mixOklab(color, TOKENS.fog, 0.45)),
      light: new THREE.Color(st === 'lost' ? TOKENS.fog : TOKENS.light),
    };
  };
  const target = useMemo(() => styleOf(state), [kind, state, hue]);
  /** While a lost memory is still letting go, it keeps the ghost's look. */
  const ghostTarget = useMemo(() => styleOf('ghost'), [kind, hue]);
  const lost = state === 'lost';

  useFrame(({ camera, clock }, dt) => {
    // The dissolve (storyboard p18): petals detach, scatter to particles, a dark seed remains.
    const dying = lost ? dissolveBeats(dissolveAge ?? (diedAt === undefined ? Infinity : performance.now() - diedAt), reduced) : ALIVE;
    const u = uniforms, t = dying.ghostLook ? ghostTarget : target;
    const k = first.current ? 1 : damp(1.2, dt);
    first.current = false;
    u.uColor.value.lerp(t.color, k); u.uStem.value.lerp(t.stem, k); u.uLight.value.lerp(t.light, k);
    u.uFill.value += (t.fill - u.uFill.value) * k;
    u.uLeafFill.value += (t.leafFill - u.uLeafFill.value) * k;
    u.uSolid.value += (t.solid - u.uSolid.value) * k;
    u.uOutline.value += (t.outline - u.uOutline.value) * k;
    u.uLineOp.value += (t.lineOp - u.uLineOp.value) * k;
    lit.current.glow += (t.glow - lit.current.glow) * k;
    lit.current.halo += (t.halo - lit.current.halo) * k;
    const swell = swellAt === undefined || reduced ? 0 : swellAmount(performance.now() - swellAt);
    // The bloom: stem rises, petals unfold, then the glow settles in.
    const age = bloomAge ?? (bornAt === undefined ? Infinity : performance.now() - bornAt);
    const born = bloomBeats(age, reduced);
    u.uGrow.value = born.grow;
    u.uUnfold.value = born.unfold;
    u.uGlow.value = (lit.current.glow + swell * 0.9) * (0.25 + 0.75 * born.glow);
    u.uHalo.value = (lit.current.halo + swell * 0.35) * born.glow;
    u.uDetach.value = dying.detach;
    u.uScatter.value = dying.scatter;
    // Particles: a one-shot scatter while dissolving, then the faint drift of the lost look.
    if (dying.scatter >= 0) u.uMotes.value = 1;
    else u.uMotes.value += ((lost ? dying.restMotes : t.motes) - u.uMotes.value) * (first.current ? 1 : damp(2, dt));
    // Dimming (focus, reveal) settles faster than a state change: ~1s.
    const wantOpacity = dim * born.opacity * dying.presence;
    u.uOpacity.value += (wantOpacity - u.uOpacity.value) * (first.current || born.opacity < 1 || lost ? 1 : damp(3, dt));

    // Ghost petals fall one by one while the flower looks like a ghost, and stay fallen if it is lost; tended back
    // to life, it is whole again. Reduced motion keeps every petal.
    const ghostly = !reduced && (state === 'ghost' || lost);
    if (!ghostly) ghostSince.current = null;
    else if (ghostSince.current === null) ghostSince.current = clock.elapsedTime;
    u.uFallT.value = ghostSince.current === null ? -1 : clock.elapsedTime - ghostSince.current;

    const time = reduced ? 0 : clock.elapsedTime;
    u.uTime.value = time;
    u.uStill.value = reduced ? 1 : 0;
    u.uPixelRatio.value = dpr;
    // Each flower sways on its own two sines, never in sync with the others.
    const sway = reduced ? 0 : (Math.sin(time * 0.5 + phase) + 0.5 * Math.sin(time * 0.31 + phase * 1.7)) * t.sway;
    droop.current += (t.droop - droop.current) * k;
    u.uBend.value = droop.current + sway;

    // Turn to face the camera around the stem (Y-billboard).
    const g = group.current;
    if (g) g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
    // The halo follows the head as the stem bends.
    if (halo.current) {
      const h = geo.head.y / geo.height;
      halo.current.position.x = geo.head.x + u.uBend.value * h * h * geo.height;
    }
    // A part that would draw nothing is not drawn at all (P12.1: in a big garden every draw call counts), except
    // while the scene warms up: then everything is drawn once, so its shader compiles before it is needed.
    const op = u.uOpacity.value, warm = warming();
    if (halo.current) halo.current.visible = warm || u.uHalo.value * op > INVISIBLE;
    if (fill.current) fill.current.visible = warm || Math.max(u.uFill.value, u.uLeafFill.value, u.uSolid.value) * op > INVISIBLE;
    if (lines.current) lines.current.visible = warm || op > INVISIBLE;
    if (motes.current) motes.current.visible = warm || u.uMotes.value * op > INVISIBLE;
  });

  const haloW = geo.width * 0.96, haloH = kind === 'place' ? geo.height * 0.4 : haloW;
  const pos = Array.isArray(position) ? position : position.toArray();

  return (
    <group ref={group} position={pos as [number, number, number]}>
      <mesh ref={halo} position={[geo.head.x, geo.head.y, -0.05]} material={mats.halo}>
        <planeGeometry args={[haloW, haloH]} />
      </mesh>
      <mesh ref={fill} geometry={geo.fill} material={mats.fill} />
      <lineSegments ref={lines} geometry={geo.lines} material={mats.lines} />
      <points ref={motes} geometry={geo.motes} material={mats.motes} />
      {(bloomAge !== undefined || (bornAt !== undefined && performance.now() - bornAt < 2400)) &&
        <BloomGrowth bornAt={bornAt ?? 0} age={bloomAge} seed={seed} />}
      {lost && <DarkSeed diedAt={diedAt} age={dissolveAge} />}
      {/* Hit area: the whole drawing box, so thin flowers are easy to reach; for a lost memory, its seed. Never drawn:
          the raycaster still finds a mesh that is not visible. */}
      <mesh visible={false} position={[0, lost ? 0.25 : geo.height / 2, 0]} onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={onClick}>
        <planeGeometry args={lost ? [0.7, 0.5] : [geo.width * 0.7, geo.height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

/** Head of a flower in world space (unrotated), for threads and the camera. */
export function flowerHead(kind: Kind, seed: string, size: number, base: THREE.Vector3): THREE.Vector3 {
  return base.clone().add(flowerGeometry(generateFlower(kind, seed, size)).head);
}
