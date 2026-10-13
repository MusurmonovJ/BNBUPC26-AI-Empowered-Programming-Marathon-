// Which of a memory's words are forgotten (D22). Like real forgetting, the specifics go first: names, places and
// numbers, then the other words that carry meaning, and the small words that hold a sentence together last. So a
// ghost keeps the shape of a memory but not what made it particular: "⋯ kitchen in ⋯, smelling of ⋯".
// Pure: text in, the indices of forgotten words out. Seeded, so the same words go on every visit, and each state
// forgets everything the one before it forgot.

import { rng, type MemoryState } from '../engine';

/** Share of a memory's words that are gone in each state. A fading memory loses only its specifics. */
export const FORGOTTEN_SHARE: Record<MemoryState, number> = { vivid: 0, fading: 0.15, ghost: 0.45, lost: 0.85 };

/** Small words that hold a sentence together; never mistaken for names, forgotten last. */
const SMALL = new Set(`a an the and or but of in on at to for with from by into onto over under about after before
up down out off again then than so as if when while i me my mine we us our you your he him his she her they them
their it its this that these those there here is am are was were be been being have has had do does did not no
don’t don't didn’t didn't can can’t can't could would will we’ll we'll i’m i'm it’s it's all just very too`.split(/\s+/));

/** A word without quotes, punctuation or a possessive: "Mei’s," → "Mei". */
const bare = (w: string) => w.replace(/^[“"‘'(]+|[”"’'),.;:!?…]+$/g, '').replace(/[’']s$/i, '');

/**
 * The forgotten words, as indices into the text's words (split on whitespace, quotes left on the words).
 * `keywords` are the memory's own people and places ("Grandma Mei", "Hangzhou"): always among the first to go.
 */
export function forgottenWords(text: string, state: MemoryState, seed: string, keywords: string[] = []): Set<number> {
  const words = text.split(/\s+/).filter(Boolean);
  const share = FORGOTTEN_SHARE[state];
  if (!share || words.length < 2) return new Set();
  const keys = new Set(keywords.flatMap((k) => k.toLowerCase().split(/\s+/)).map(bare).filter(Boolean));
  const r = rng(`words:${seed || text}`);
  const ranked = words.map((w, i) => {
    const b = bare(w), lower = b.toLowerCase();
    const sentenceStart = i === 0 || /[.!?…]["”’]?$/.test(words[i - 1]);
    const small = SMALL.has(lower) || !b;
    // 3: the specifics (its own people and places, other names, numbers); 2: other words that carry meaning; 1: small words.
    const specific = !small && (keys.has(lower) || /\d/.test(b) || (/^\p{Lu}/u.test(b) && !sentenceStart));
    const weight = specific ? 3 : !small && b.length >= 4 ? 2 : 1;
    return { i, weight, tie: r() };
  }).sort((a, b) => b.weight - a.weight || a.tie - b.tie);
  // A name of several words goes as a whole ("Grandma Mei’s", "Gymnopédie No. 1"): neighbouring specifics are one.
  const weightOf = new Map(ranked.map((w) => [w.i, w.weight]));
  const nameAround = (i: number) => {
    const out = [i];
    if (weightOf.get(i) !== 3) return out;
    for (let j = i - 1; weightOf.get(j) === 3; j--) out.push(j);
    for (let j = i + 1; weightOf.get(j) === 3; j++) out.push(j);
    return out;
  };
  // A fading memory forgets only its specifics; every state keeps at least one word.
  const most = state === 'fading' ? ranked.filter((w) => w.weight === 3).length : words.length - 1;
  const count = Math.min(most, Math.round(words.length * share));
  const gone = new Set<number>();
  for (const w of ranked) {
    if (gone.size >= count) break;
    for (const i of nameAround(w.i)) if (gone.size < most) gone.add(i);
  }
  return gone;
}

/** A word split around its punctuation, so only the word itself is forgotten: "“Text" → "“", "Text", "". */
export function splitWord(w: string): [string, string, string] {
  const m = /^([“"‘'(]*)(.*?)([”"’'),.;:!?…]*)$/u.exec(w);
  return m && m[2] ? [m[1], m[2], m[3]] : ['', w, ''];
}
