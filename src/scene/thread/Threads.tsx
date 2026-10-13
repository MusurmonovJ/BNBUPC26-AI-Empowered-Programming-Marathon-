// Every thread in the garden, between flower heads. Brightness comes from the engine (threadBrightness).
// Hovering a flower lights its threads and dims the rest, "to show what holds the memory up". While a memory
// is open, every thread recedes with the garden, so no light crosses its words (screen p2).
// When a memory is lost the engine drops its threads at once; here they stay a little longer, flicker and go
// out with the dissolve (storyboard p18).
// A big garden draws only its strongest threads (D19): every thread still holds its memories up in the engine.

import { useMemo, useRef } from 'react';
import { threadBrightness, threadKey, type MemoryView } from '../../engine';
import { useGarden, useRevealHeld, useTendReach } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { useLayout } from '../useLayout';
import { BLOOM_MS } from '../fx/bloomTimeline';
import { threadDeparture } from '../fx/dissolveTimeline';
import { HOVER_DIM, HOVER_LIT, REVEAL_DIM, REVEAL_LIT, RIPPLE_TRAVEL_MS, ThreadArc } from './ThreadArc';
import type * as THREE from 'three';

/** Up to this many threads, every one is drawn (the demo garden has eight). */
const DRAW_ALL_UP_TO = 24;
/** Past that, at most this many are drawn at rest, and never more than 1.25 per flower (D19). */
const THREAD_BUDGET = 60;
const PER_FLOWER_SHARE = 1.25;
/** The episode's closing composition: threads outside the lit holder stay faintly visible. */
const PRESENT_THREAD_DIM = 0.4;
/** Past the budget, each flower keeps at least its strongest few. */
const THREADS_PER_FLOWER = 2;

type Drawn = {
  key: string; ids: [string, string]; a: THREE.Vector3; b: THREE.Vector3; strength: number; flicker: boolean;
  departing?: { flickerFrom: number; releaseAt: number; goneAt: number };
};

export function Threads() {
  const garden = useGarden((s) => s.garden);
  const shown = useGarden((s) => s.shown);
  const hoveredId = useGarden((s) => s.hoveredId);
  const focusedId = useGarden((s) => s.focusedId);
  const events = useGarden((s) => s.events);
  const layout = useLayout();
  const held = useRevealHeld();
  const revealOpen = useGarden((s) => s.reveal.open);
  // In the episode, an open memory with light to spend lights the threads its tending would travel along.
  const reach = useTendReach();
  const emphasisFor = (ids: string[]) =>
    held ? (ids.every((id) => held.includes(id)) ? REVEAL_LIT : revealOpen ? REVEAL_DIM : PRESENT_THREAD_DIM)
    : focusedId ? (reach && ids.includes(focusedId) ? HOVER_LIT : HOVER_DIM)
    : !hoveredId ? 1 : ids.includes(hoveredId) ? HOVER_LIT : HOVER_DIM;

  const live = useMemo(() => garden.threads.flatMap((t): Drawn[] => {
    const A = garden.memories[t.a], B = garden.memories[t.b];
    const LA = layout[t.a], LB = layout[t.b];
    if (!A || !B || !LA || !LB || !shown[t.a] || !shown[t.b]) return [];
    // While the slider previews the future, a memory can look lost before the engine has let it go: no thread to it.
    if (shown[t.a].state === 'lost' || shown[t.b].state === 'lost') return [];
    return [{
      key: threadKey(t.a, t.b),
      ids: [t.a, t.b],
      a: flowerHead(A.kind, A.id, LA.size, baseToWorld(LA.x, LA.y)),
      b: flowerHead(B.kind, B.id, LB.size, baseToWorld(LB.x, LB.y)),
      strength: threadBrightness(t, shown[t.a].vitality, shown[t.b].vitality),
      flicker: isGhost(shown[t.a]) || isGhost(shown[t.b]),
    }];
  }), [garden, shown, layout]);

  // The threads a big garden draws: each flower's strongest few, then the strongest of the rest, up to the budget.
  const strongest = useMemo(() => {
    if (live.length <= DRAW_ALL_UP_TO) return live;
    const cap = Math.min(THREAD_BUDGET, Math.round(Object.keys(garden.memories).length * PER_FLOWER_SHARE));
    const byStrength = [...live].sort((x, y) => y.strength - x.strength);
    const count = new Map<string, number>();
    const keep = new Set<Drawn>();
    for (const t of byStrength) {
      if (keep.size >= cap) break;
      if (t.ids.some((id) => (count.get(id) ?? 0) < THREADS_PER_FLOWER)) {
        keep.add(t);
        for (const id of t.ids) count.set(id, (count.get(id) ?? 0) + 1);
      }
    }
    for (const t of byStrength) { if (keep.size >= cap) break; keep.add(t); }
    return live.filter((t) => keep.has(t));
  }, [live, garden]);
  // What the person is looking at always shows all its threads: the hovered or open flower, or the reveal's holder.
  const drawn = useMemo(() => {
    if (strongest === live) return live;
    const near = (t: Drawn) => (held ? t.ids.every((id) => held.includes(id)) : t.ids.some((id) => id === hoveredId || id === focusedId));
    const kept = new Set(strongest);
    return live.filter((t) => kept.has(t) || near(t));
  }, [live, strongest, hoveredId, focusedId, held]);

  // Threads that just disappeared because one end is dissolving: keep drawing them until they have gone out.
  const previous = useRef(new Map<string, Drawn>());
  const departing = useRef(new Map<string, Drawn>());
  const now = performance.now();
  const liveKeys = new Set(live.map((t) => t.key));
  for (const [key, t] of previous.current) {
    if (liveKeys.has(key) || departing.current.has(key)) continue;
    const died = events.filter((e) => e.type === 'dissolve' && t.ids.includes(e.id)).at(-1);
    if (died && now - died.at < 6000) departing.current.set(key, { ...t, departing: threadDeparture(died.at) });
  }
  for (const [key, t] of departing.current) {
    if (liveKeys.has(key) || (t.departing && now > t.departing.goneAt + 1000)) departing.current.delete(key);
  }
  // Only a thread that was drawn can be seen going out.
  previous.current = new Map(drawn.map((t) => [t.key, t]));

  // The latest tend at either end of a thread sends a ripple along it, away from the tended flower.
  // A memory that just bloomed sends one too, once it has finished growing: its first threads are lit by a pulse
  // of light from it to each neighbour, and only then fade in (the first-thread moment).
  const rippleFor = (ids: string[]) => {
    const e = events.filter((x) => (x.type === 'tend' || x.type === 'bloom') && ids.includes(x.id)).at(-1);
    if (!e) return undefined;
    return { at: e.type === 'bloom' ? e.at + BLOOM_MS.settle : e.at, fromB: e.id === ids[1] };
  };
  const holdFor = (ids: string[]) => {
    const e = events.filter((x) => x.type === 'bloom' && ids.includes(x.id)).at(-1);
    return e ? e.at + BLOOM_MS.settle + RIPPLE_TRAVEL_MS : undefined;
  };

  return (
    <>
      {drawn.map((t) => (
        <ThreadArc key={t.key} seed={t.key} a={t.a} b={t.b} strength={t.strength} flicker={t.flicker}
          emphasis={emphasisFor(t.ids)} ripple={rippleFor(t.ids)} holdUntil={holdFor(t.ids)} />
      ))}
      {[...departing.current.values()].map((t) => (
        <ThreadArc key={`${t.key}:departing`} seed={t.key} a={t.a} b={t.b} strength={t.strength} flicker={t.flicker}
          emphasis={emphasisFor(t.ids)} departing={t.departing} />
      ))}
    </>
  );
}

const isGhost = (v: MemoryView) => v.state === 'ghost';
