// Client side of tagging. The offline tagger (./offline.ts) is the base and runs in the browser; /api/tag
// (Claude or Groq, whichever key the server has) is an optional upgrade. Planting never waits on the network:
// the store plants with offline tags first and calls apiTag() in the background (see src/store/garden.ts).
//
// Backing off, so a free tier is never hammered:
//   503 (no provider configured) → stop asking for the rest of the session
//   429 (rate limit)             → offline only for COOLDOWN_MS, or longer if the server says retry-after
//   slow (> API_TIMEOUT_MS), network error, any other status, malformed reply → offline this time

import type { Garden, Kind } from '../engine';
import type { Tags } from '../engine/garden';
import { offlineTag } from './offline';

export type TagSource = 'claude' | 'groq' | 'offline';
export type TagResult = { people: Tags; places: Tags; feelings: Tags; source: TagSource };

export const API_TIMEOUT_MS = 4000;
export const COOLDOWN_MS = 3 * 60_000;

const policy = { off: false, cooldownUntil: 0 };

/** For tests, and for the hidden slider's "reset demo garden". */
export function resetTaggingPolicy() { policy.off = false; policy.cooldownUntil = 0; }
export function taggingPolicy() { return { ...policy }; }

type Wire = { name: string; id: string | null };
const isWire = (x: unknown): x is Wire[] =>
  Array.isArray(x) && x.every((t) => t && typeof t.name === 'string' && (t.id === null || typeof t.id === 'string'));

/** Ask the tagging provider. Returns null whenever the offline tags should stand. */
export async function apiTag(g: Garden, kind: Kind, text: string, signal?: AbortSignal): Promise<TagResult | null> {
  if (policy.off || Date.now() < policy.cooldownUntil) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const known = Object.values(g.entities).map(({ id, kind, name }) => ({ id, kind, name }));
    const res = await fetch('/api/tag', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, text, known }), signal: ctrl.signal,
    });
    if (res.status === 503) { policy.off = true; return null; }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000 || 0;
      policy.cooldownUntil = Date.now() + Math.max(COOLDOWN_MS, retryAfter);
      return null;
    }
    if (!res.ok) return null;
    const j = await res.json() as { people?: unknown; places?: unknown; feelings?: unknown };
    if (!isWire(j.people) || !isWire(j.places) || !Array.isArray(j.feelings) || !j.feelings.every((f) => typeof f === 'string')) return null;
    const named = (xs: Wire[]) => xs.map((x) => ({ name: x.name, id: x.id ?? undefined }));
    const source = res.headers.get('x-lethe-tagger') === 'claude' ? 'claude' : 'groq';
    return { people: named(j.people), places: named(j.places), feelings: (j.feelings as string[]).map((name) => ({ name })), source };
  } catch {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    return null; // timeout or network error: the offline tags stand
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Best available tags: the provider's if it answers in time, otherwise the offline tagger's. */
export async function tag(g: Garden, kind: Kind, text: string, signal?: AbortSignal): Promise<TagResult> {
  return (await apiTag(g, kind, text, signal)) ?? { ...(await offlineTag(g, kind, text)), source: 'offline' };
}
