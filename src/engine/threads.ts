import { FEELING_ONLY_WEIGHT, THREAD_FULL_AT, THREAD_WEIGHT } from './constants';
import { placeKey, placeOf, relationKey, relationOf } from './relations';
import type { Entity, EntityKind, Garden, Memory, Thread } from './types';

export const threadKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function threadWeight(t: Thread): number {
  return t.level === 0 ? FEELING_ONLY_WEIGHT : THREAD_WEIGHT[t.level];
}

export function neighbours(g: Garden, id: string): { other: string; thread: Thread }[] {
  const out: { other: string; thread: Thread }[] = [];
  for (const t of g.threads) {
    if (t.a === id) out.push({ other: t.b, thread: t });
    else if (t.b === id) out.push({ other: t.a, thread: t });
  }
  return out;
}

/** People and places two memories share. Feelings are counted separately: alone they only make a faint thread. */
export function shared(a: Memory, b: Memory): { anchors: string[]; feelings: string[] } {
  const inter = (x: string[], y: string[]) => x.filter((e) => y.includes(e));
  return {
    anchors: [...inter(a.people, b.people), ...inter(a.places, b.places)],
    feelings: inter(a.feelings, b.feelings),
  };
}

/** The thread two memories would have, or null. */
export function threadBetween(a: Memory, b: Memory): Thread | null {
  const s = shared(a, b);
  if (s.anchors.length > 0) {
    return { a: a.id, b: b.id, level: Math.min(3, s.anchors.length) as 1 | 2 | 3, source: 'auto' };
  }
  if (s.feelings.length > 0) return { a: a.id, b: b.id, level: 0, source: 'auto' };
  return null;
}

/** Threads a memory would join if planted now. Shown as dashed suggestions before Plant. */
export function suggestThreads(g: Garden, m: Memory): Thread[] {
  const out: Thread[] = [];
  for (const other of Object.values(g.memories)) {
    if (other.id === m.id || other.lost) continue;
    if (g.rejected.includes(threadKey(m.id, other.id))) continue;
    const t = threadBetween(m, other);
    if (t) out.push(t);
  }
  return out;
}

/**
 * Recompute the active threads: auto threads from shared entities between living memories (minus rejected
 * ones), plus every drawn thread whose ends are both living. Drawn threads are never forgotten, so returning
 * a memory re-forms them too (decisions D4).
 */
export function rebuildThreads(g: Garden): void {
  const manual = g.drawn ?? [];
  const ids = Object.keys(g.memories).filter((id) => !g.memories[id].lost);
  const auto: Thread[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (g.rejected.includes(threadKey(ids[i], ids[j]))) continue;
      if (manual.some((t) => threadKey(t.a, t.b) === threadKey(ids[i], ids[j]))) continue;
      const t = threadBetween(g.memories[ids[i]], g.memories[ids[j]]);
      if (t) auto.push(t);
    }
  }
  g.threads = [...manual.filter((t) => !g.memories[t.a]?.lost && !g.memories[t.b]?.lost), ...auto];
}

export function rejectThread(g: Garden, a: string, b: string): void {
  const k = threadKey(a, b);
  if (!g.rejected.includes(k)) g.rejected.push(k);
  g.threads = g.threads.filter((t) => threadKey(t.a, t.b) !== k);
  g.drawn = (g.drawn ?? []).filter((t) => threadKey(t.a, t.b) !== k);
}

export function drawThread(g: Garden, a: string, b: string): void {
  const k = threadKey(a, b);
  g.rejected = g.rejected.filter((r) => r !== k);
  g.drawn = [...(g.drawn ?? []).filter((t) => threadKey(t.a, t.b) !== k), { a, b, level: 1, source: 'manual' }];
  rebuildThreads(g);
}

/* ---------- entity matching: "Mom" and "my mother" become one person ---------- */

const norm = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/^(my|our|the)\s+/, '').replace(/[’']s$/, '').replace(/[^\p{L}\p{N} ]/gu, '').trim();

/**
 * Matching key: people named by relation share one key, so "Mom", "mum" and "my mother" are one person; everyday
 * places with more than one name share one too, so "home", "our homeplace" and "my house" are one place.
 */
const keyOf = (kind: EntityKind, name: string) =>
  kind === 'person' ? relationKey(norm(name)) : kind === 'place' ? placeKey(norm(name), name) : norm(name);

export function findEntity(g: Garden, kind: EntityKind, name: string): Entity | undefined {
  const k = keyOf(kind, name);
  return Object.values(g.entities).find(
    (e) => e.kind === kind && (keyOf(kind, e.name) === k || e.aliases.some((a) => keyOf(kind, a) === k)),
  );
}

/** Resolve a tagged name to an entity id, creating the entity if new. `existingId` comes from a tagging provider when it matched a known entity. */
export function resolveEntity(g: Garden, kind: EntityKind, name: string, existingId?: string): string {
  if (existingId && g.entities[existingId]?.kind === kind) {
    const e = g.entities[existingId];
    const n = norm(name);
    if (n && keyOf(kind, e.name) !== keyOf(kind, name) && !e.aliases.includes(n)) e.aliases.push(n);
    return e.id;
  }
  const found = findEntity(g, kind, name);
  if (found) return found.id;
  const k = keyOf(kind, name);
  const id = `${kind}:${k.replace(/ /g, '-') || 'unnamed'}`;
  let unique = id;
  for (let i = 2; g.entities[unique]; i++) unique = `${id}-${i}`;
  // People named by relation are shown the same way whoever tagged them ("my mother" → "Mom").
  const relation = kind === 'person' ? relationOf(norm(name)) : undefined;
  const place = kind === 'place' ? placeOf(norm(name), name) : undefined;
  g.entities[unique] = { id: unique, kind, name: relation?.display ?? place?.display ?? name.trim(), aliases: [] };
  return unique;
}

/**
 * How bright a thread draws (0–1): its weight, dimmed as either end fades (docs/systems.md § Threads).
 * Reproduces the sample strengths: two vivid ends 0.85–0.95, vivid–fading ~0.6, fading–fading ~0.43.
 */
export function threadBrightness(t: Thread, vitalityA: number, vitalityB: number): number {
  return threadWeight(t) * Math.min(1, Math.sqrt(Math.max(0, vitalityA * vitalityB)) / THREAD_FULL_AT);
}
