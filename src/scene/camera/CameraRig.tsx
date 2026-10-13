// Camera (scene-spec § World, D23): drag to turn, right-drag or two fingers to move over the garden, scroll to come
// close or rise above it (toward the cursor), WASD or the arrow keys to glide, Q/E to turn. The person's gestures
// are never fought: the rig only moves the camera when it has a goal (focusing a memory, the reveal, or gliding
// back to where the person was before either), and the idle drift is a small offset that never pulls them back.
// Nothing bounces, nothing snaps.

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGarden } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { damp, useReducedMotion } from '../motion';
import { useLayout } from '../useLayout';

export const HOME_POS = new THREE.Vector3(0, 3.4, 11.5);
export const HOME_TARGET = new THREE.Vector3(0, 1.1, 0);
/**
 * Focus framing (screen p2): look a little to the right of the flower's head, from in front of and slightly
 * above it, so the flower stands at about a third of the width and its words fit on the right half.
 */
const FOCUS_LOOK_SHIFT = new THREE.Vector3(1.0, 0, 0);
const FOCUS_OFFSET = new THREE.Vector3(0, 0.7, 4.4);

const DEG = Math.PI / 180;
/**
 * The reveal (scene-spec § The reveal, screen p12): rise over the garden and look down at ~36°, with the garden
 * shifted right of centre so the list of people and places has the left of the screen.
 */
const REVEAL_TARGET = new THREE.Vector3(-2.4, 0.4, 0.6);
const REVEAL_POS = new THREE.Vector3(-2.4, 7.2, 10.0);
/** Limits (D23): free enough to explore a garden, never upside down, never under the ground, never far from it. */
const MIN_POLAR = 30 * DEG;
const AZIMUTH = 70 * DEG;
/** Zooming out lowers the polar ceiling, so the camera rises over the garden as it pulls back. */
const NEAR = { dist: 11.5, maxPolar: 83 * DEG };
const FAR = { dist: 24, maxPolar: 50 * DEG };
const MIN_DIST = 3;
/** The point the camera looks at stays over the garden (world units). */
const BOUNDS = { minX: -9, maxX: 9, minZ: -7, maxZ: 6.5 };
/** Keyboard glide: world units per second at the home distance, scaled by distance; turn in radians per second. */
const KEY_SPEED = 4.5;
const KEY_TURN = 0.9;
/** Drift waits this long after the last touch, then fades in over DRIFT_FADE_S. */
const IDLE_S = 5;
const DRIFT_FADE_S = 2;
/** A glide back counts as arrived within this distance, and hands the camera back to the person. */
const ARRIVED = 0.02;

/** Drift: x ± 0.8 over 40s, y ± 0.15 over 55s. */
function driftAt(t: number, out: THREE.Vector3) {
  return out.set(Math.sin((t / 40) * Math.PI * 2) * 0.8, Math.sin((t / 55) * Math.PI * 2) * 0.15, 0);
}

type Pose = { pos: THREE.Vector3; target: THREE.Vector3 };
const typing = (el: Element | null) =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable);
const MOVE_KEYS: Record<string, [number, number]> = {
  w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};
const TURN_KEYS: Record<string, number> = { q: 1, e: -1 };

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const clock = useThree((s) => s.clock);
  const layout = useLayout();
  const reduced = useReducedMotion();

  const lastTouch = useRef(-Infinity);
  const dragging = useRef(false);
  /** Where the person was before a focus or the reveal took the camera; it glides back there afterwards. */
  const before = useRef<Pose | null>(null);
  /** A glide back to `before`, running until it arrives or the person moves the camera. */
  const returning = useRef<Pose | null>(null);
  /** The focused memory's framing, worked out once per focus rather than every frame. */
  const focus = useRef<{ id: string | null; lost?: boolean; overridden: boolean; target?: THREE.Vector3; pos?: THREE.Vector3 }>({ id: null, overridden: false });
  /** The reveal's pose holds until the person moves the camera themselves. */
  const reveal = useRef({ open: false, overridden: false });
  /** The drift offset currently applied on top of the person's pose. */
  const drifted = useRef(new THREE.Vector3());
  const driftWant = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  /** Keys held for gliding and turning, and the smoothed velocity they produce. */
  const held = useRef(new Set<string>());
  const vel = useRef(new THREE.Vector3());
  const velWant = useRef(new THREE.Vector3());
  const spin = useRef(0);

  /** The person took the camera: whatever the rig was doing gives way, and the drift starts again from nothing. */
  const touched = () => {
    lastTouch.current = clock.elapsedTime;
    returning.current = null;
    drifted.current.set(0, 0, 0);
    if (reveal.current.open) reveal.current.overridden = true;
    if (focus.current.id) focus.current.overridden = true;
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(document.activeElement)) return;
      const k = e.key.toLowerCase();
      if (!(k in MOVE_KEYS) && !(k in TURN_KEYS)) return;
      if (k.startsWith('arrow')) e.preventDefault();
      held.current.add(k);
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.key.toLowerCase());
    const clear = () => held.current.clear();
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    addEventListener('blur', clear);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', clear); };
  }, []);

  /** One frame of the rig. It may move the camera and what it looks at; `useFrame` below re-aims it afterwards. */
  const rig = (c: OrbitControlsImpl, dt: number) => {
    const t = clock.elapsedTime;
    const step = Math.min(dt, 0.05);

    // Scrolling out rises above the garden: the further away, the lower the max polar angle.
    const dist = camera.position.distanceTo(c.target);
    c.maxPolarAngle = THREE.MathUtils.lerp(NEAR.maxPolar, FAR.maxPolar, THREE.MathUtils.smoothstep(dist, NEAR.dist, FAR.dist));

    const { focusedId: selectedId, garden, presentation, shown } = useGarden.getState();
    const focusedId = presentation.headId ?? selectedId;
    const revealing = useGarden.getState().reveal.open || presentation.overview;
    const hadGoal = !!focus.current.id || reveal.current.open;
    // Re-frame when the focus changes, or when the open memory is lost or returned (seed ↔ flower).
    const focusedLost = focusedId ? presentation.headId === focusedId ? false : shown[focusedId]?.state === 'lost' : undefined;
    const reframed = focusedId !== focus.current.id || focusedLost !== focus.current.lost;
    if (reframed) {
      const m = focusedId ? garden.memories[focusedId] : null;
      const L = focusedId ? layout[focusedId] : null;
      // A lost memory is only its dark seed: come close to the seed on the ground.
      const point = m && L ? (focusedLost ? baseToWorld(L.x, L.y).setY(0.35) : flowerHead(m.kind, m.id, L.size, baseToWorld(L.x, L.y))) : undefined;
      const target = point?.add(FOCUS_LOOK_SHIFT);
      focus.current = { id: focusedId, lost: focusedLost, overridden: false, target, pos: target?.clone().add(FOCUS_OFFSET) };
    }
    if (revealing !== reveal.current.open) reveal.current = { open: revealing, overridden: false };
    const hasGoal = !!focus.current.id || revealing;
    // A goal begins: remember where the person was. It ends: glide back there, unless they moved during it.
    if (hasGoal && !hadGoal) {
      before.current = { pos: camera.position.clone().sub(drifted.current), target: c.target.clone().sub(drifted.current) };
      drifted.current.set(0, 0, 0);
      returning.current = null;
    }
    // A goal begins (or moves to another memory): the click that opened it left a little spin in the controls'
    // inertia. Let it go at once, so it never nudges the glide (that read as a shake).
    if (hasGoal && (!hadGoal || reframed)) {
      c.enableDamping = false;
      c.update();
      c.enableDamping = true;
    }
    if (!hasGoal && hadGoal) {
      const moved = focus.current.overridden || reveal.current.overridden;
      returning.current = moved ? null : before.current;
      before.current = null;
    }
    c.minPolarAngle = revealing ? 45 * DEG : MIN_POLAR;

    // Keyboard: glide over the ground along where the camera looks, and turn around what it looks at.
    let mx = 0, mz = 0, turn = 0;
    for (const k of held.current) {
      const m = MOVE_KEYS[k];
      if (m) { mx += m[0]; mz += m[1]; }
      turn += TURN_KEYS[k] ?? 0;
    }
    const keyed = mx !== 0 || mz !== 0 || turn !== 0;
    if (keyed) touched();
    const fwd = tmp.current.subVectors(c.target, camera.position).setY(0).normalize();
    const speed = KEY_SPEED * Math.max(0.5, dist / NEAR.dist);
    const wantVel = velWant.current.set(fwd.x * mz - fwd.z * mx, 0, fwd.z * mz + fwd.x * mx);
    if (wantVel.lengthSq() > 1) wantVel.normalize();
    vel.current.lerp(wantVel.multiplyScalar(speed), damp(10, step));
    spin.current += (turn * KEY_TURN - spin.current) * damp(10, step);
    if (vel.current.lengthSq() > 1e-6) {
      camera.position.addScaledVector(vel.current, step); c.target.addScaledVector(vel.current, step);
    }
    if (Math.abs(spin.current) > 1e-4) {
      const off = tmp.current.subVectors(camera.position, c.target).applyAxisAngle(THREE.Object3D.DEFAULT_UP, spin.current * step);
      camera.position.copy(c.target).add(off);
    }

    // Keep what the camera looks at over the garden; the camera keeps its offset, so nothing jumps.
    const tx = THREE.MathUtils.clamp(c.target.x, BOUNDS.minX, BOUNDS.maxX) - c.target.x;
    const tz = THREE.MathUtils.clamp(c.target.z, BOUNDS.minZ, BOUNDS.maxZ) - c.target.z;
    if (tx || tz) { c.target.x += tx; c.target.z += tz; camera.position.x += tx; camera.position.z += tz; }

    if (dragging.current || keyed) return;

    // Goals: the open memory, the reveal, or the way back to where the person was.
    let goal: Pose | null = null;
    if (revealing && !reveal.current.overridden) goal = { pos: REVEAL_POS, target: REVEAL_TARGET };
    else if (focus.current.id && focus.current.target && focus.current.pos && !focus.current.overridden) {
      goal = { pos: focus.current.pos, target: focus.current.target };
    } else if (returning.current) goal = returning.current;
    if (goal) {
      // Reduced motion: no cinematic glides, the camera cuts to its goal.
      const k = reduced ? 1 : damp(hasGoal ? 1.2 : 1.0, step);
      camera.position.lerp(goal.pos, k);
      c.target.lerp(goal.target, k);
      if (goal === returning.current && camera.position.distanceTo(goal.pos) < ARRIVED && c.target.distanceTo(goal.target) < ARRIVED) {
        returning.current = null;
      }
      return;
    }

    // No goal: the camera is the person's. After a while still, it drifts a little around where they left it.
    const idle = t - lastTouch.current;
    const weight = reduced || hasGoal ? 0 : THREE.MathUtils.smoothstep(idle, IDLE_S, IDLE_S + DRIFT_FADE_S);
    driftAt(t, driftWant.current).multiplyScalar(weight);
    const delta = tmp.current.subVectors(driftWant.current, drifted.current);
    camera.position.add(delta);
    c.target.add(delta);
    drifted.current.copy(driftWant.current);
  };

  // The controls aim the camera before the rig runs; the rig may then move the camera and what it looks at. Aim
  // again afterwards, so position and aim always agree in the frame that is drawn (otherwise a glide shakes).
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    rig(c, dt);
    camera.lookAt(c.target);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.7}
      zoomSpeed={0.9}
      zoomToCursor
      enablePan
      screenSpacePanning={false}
      panSpeed={0.9}
      minDistance={MIN_DIST}
      maxDistance={FAR.dist}
      minAzimuthAngle={-AZIMUTH}
      maxAzimuthAngle={AZIMUTH}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={NEAR.maxPolar}
      target={HOME_TARGET.toArray()}
      onStart={() => { dragging.current = true; touched(); }}
      onEnd={() => { dragging.current = false; lastTouch.current = clock.elapsedTime; }}
    />
  );
}
