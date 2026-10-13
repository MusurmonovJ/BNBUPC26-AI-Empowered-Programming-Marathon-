// FlowerData (design px, y down) → merged Three.js buffers in world units (1 unit = 100px, y up).
// One flower = 1 fill mesh + 1 line set + 1 mote cloud + 1 halo quad, whatever its kind.
// Per-vertex attributes tell the shaders which colour and opacity each part takes; the state lives in uniforms.

import * as THREE from 'three';
import { rng } from '../../engine';
import type { FlowerData, Part, V2 } from './generator';

export const PART_CODE: Record<Part, number> = { petal: 0, stem: 1, light: 2 };
/** Line part code 3 = light-coloured stroke drawn only while solid (photo stamens). */
const SOLID_LIGHT_LINE = 3;

const PX = 100;
/** How far petals cup toward the viewer around the head (world units per unit²). */
const CUP = 0.35;
/** Ghost petals fall one by one until this share has fallen (scene-spec § Flowers). */
const FALL_SHARE = 0.4;

export type FlowerGeometry = {
  fill: THREE.BufferGeometry;
  lines: THREE.BufferGeometry;
  motes: THREE.BufferGeometry;
  /** Head position in flower-local world units (y up). */
  head: THREE.Vector3;
  /** Full height in world units, for the bend in the shaders. */
  height: number;
  width: number;
};

const cache = new Map<FlowerData, FlowerGeometry>();

export function flowerGeometry(d: FlowerData): FlowerGeometry {
  let g = cache.get(d);
  if (!g) { g = build(d); cache.set(d, g); }
  return g;
}

function build(d: FlowerData): FlowerGeometry {
  const hx = d.head.x / PX, hy = -d.head.y / PX;
  const toWorld = (p: V2, z = 0) => [p.x / PX, -p.y / PX, z] as const;

  // Which petals a ghost lets fall, and in what order: seeded by the flower's own shape, so the same petals fall
  // on every visit. aFall is the petal's turn (0, 1, 2...) or −1 for everything that never falls.
  const petals = d.shapes.filter((s) => s.part === 'petal');
  const order = petals.map((_, i) => i);
  const r = rng(`fall:${d.kind}:${petals.length}:${petals[0]?.pts[0]?.x.toFixed(3) ?? 0}`);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const turn = new Map<(typeof d.shapes)[number], number>();
  order.slice(0, Math.floor(petals.length * FALL_SHARE)).forEach((pi, k) => turn.set(petals[pi], k));
  const fallOf = (s: (typeof d.shapes)[number]) => turn.get(s) ?? -1;

  /* ---------- fills: triangulated shapes ---------- */
  const fPos: number[] = [], fPart: number[] = [], fAlpha: number[] = [], fSolid: number[] = [], fFall: number[] = [];
  for (const s of d.shapes) {
    if (s.fill <= 0) continue;
    const contour = s.pts.map((p) => new THREE.Vector2(p.x, p.y));
    if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const tri of tris) {
      for (const i of tri) {
        const [x, y] = toWorld({ x: contour[i].x, y: contour[i].y });
        const dist2 = (x - hx) ** 2 + (y - hy) ** 2;
        const z = (s.cup ? CUP * dist2 : 0) + (s.back ? -0.02 : 0) + (s.part === 'light' ? 0.01 : 0);
        fPos.push(x, y, z);
        fPart.push(PART_CODE[s.part]);
        fAlpha.push(s.fill);
        fSolid.push(s.solidOnly ? 1 : 0);
        fFall.push(fallOf(s));
      }
    }
  }
  const fill = new THREE.BufferGeometry();
  fill.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  fill.setAttribute('aPart', new THREE.Float32BufferAttribute(fPart, 1));
  fill.setAttribute('aAlpha', new THREE.Float32BufferAttribute(fAlpha, 1));
  fill.setAttribute('aSolidOnly', new THREE.Float32BufferAttribute(fSolid, 1));
  fill.setAttribute('aFall', new THREE.Float32BufferAttribute(fFall, 1));

  /* ---------- lines: outlines of shapes + strokes, as segment pairs ---------- */
  const lPos: number[] = [], lPart: number[] = [], lAlpha: number[] = [], lFall: number[] = [];
  const pushPolyline = (pts: V2[], closed: boolean, part: number, alpha: number, cup: boolean, back: boolean, fall = -1) => {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      for (const p of [pts[i], pts[(i + 1) % pts.length]]) {
        const [x, y] = toWorld(p);
        const z = (cup ? CUP * ((x - hx) ** 2 + (y - hy) ** 2) : 0) + (back ? -0.02 : 0) + 0.002;
        lPos.push(x, y, z); lPart.push(part); lAlpha.push(alpha); lFall.push(fall);
      }
    }
  };
  for (const s of d.shapes) if (s.line > 0) pushPolyline(s.pts, true, PART_CODE[s.part], s.line, !!s.cup, !!s.back, fallOf(s));
  for (const s of d.strokes) pushPolyline(s.pts, false, s.solidOnly ? SOLID_LIGHT_LINE : PART_CODE[s.part], s.line, false, false);
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
  lines.setAttribute('aPart', new THREE.Float32BufferAttribute(lPart, 1));
  lines.setAttribute('aAlpha', new THREE.Float32BufferAttribute(lAlpha, 1));
  lines.setAttribute('aFall', new THREE.Float32BufferAttribute(lFall, 1));

  /* ---------- motes: lost-state particles ---------- */
  const mPos: number[] = [], mDrift: number[] = [], mTime: number[] = [], mSize: number[] = [];
  for (const m of d.motes) {
    const [x, y] = toWorld(m.at);
    mPos.push(x, y, 0.01);
    mDrift.push(m.dx / PX, -m.dy / PX);
    mTime.push(m.delay, m.dur);
    mSize.push(m.r);
  }
  const motes = new THREE.BufferGeometry();
  motes.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
  motes.setAttribute('aDrift', new THREE.Float32BufferAttribute(mDrift, 2));
  motes.setAttribute('aTime', new THREE.Float32BufferAttribute(mTime, 2));
  motes.setAttribute('aSize', new THREE.Float32BufferAttribute(mSize, 1));

  return { fill, lines, motes, head: new THREE.Vector3(hx, hy, 0), height: d.H / PX, width: d.W / PX };
}
