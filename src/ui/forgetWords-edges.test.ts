import { describe, expect, it } from 'vitest';
import { forgottenWords, splitWord } from './forgetWords';

// Forgetting edge and regression tests (Spark). The primary behaviour is Claude's
// (D22, `forgetWords.ts`); here the contract is pinned: specifics go first, small
// words last, seeded and monotone across states, at least one word always stays.

const TEXT = 'Grandma Mei’s kitchen in Hangzhou, smelling of osmanthus';
const KEYS = ['Grandma Mei', 'Hangzhou'];
const words = TEXT.split(/\s+/).filter(Boolean);

describe('forgottenWords: specifics first', () => {
  it('vivid forgets nothing, even with keywords', () => {
    expect(forgottenWords(TEXT, 'vivid', 'm2', KEYS).size).toBe(0);
  });

  it('a one-word memory never forgets', () => {
    expect(forgottenWords('Solitude', 'lost', 'm9', []).size).toBe(0);
  });

  it('fading forgets only specifics, never small words', () => {
    const gone = forgottenWords(TEXT, 'fading', 'm2', KEYS);
    expect(gone.size).toBeGreaterThan(0);
    const inIdx = words.findIndex((w) => w.toLowerCase() === 'in');
    expect(gone.has(inIdx)).toBe(false);
    for (const i of gone) {
      expect(words[i]).toMatch(/Grandma|Mei|kitchen|Hangzhou|osmanthus/i);
    }
  });

  it('keywords go before other words: a ghost keeps shape, not particulars', () => {
    const gone = forgottenWords(TEXT, 'ghost', 'm2', KEYS);
    const at = (w: string) => words.findIndex((x) => x.includes(w));
    expect(gone.has(at('Grandma'))).toBe(true);
    expect(gone.has(at('Hangzhou'))).toBe(true);
    // "in" is the last kind of word to go.
    const smallGone = [...gone].filter((i) => /^(in|of)$/i.test(words[i].replace(/[,.]/g, '')));
    expect(smallGone.length).toBeLessThanOrEqual(gone.size - 2);
  });

  it('a multi-word name goes as a whole', () => {
    const gone = forgottenWords(TEXT, 'ghost', 'm2', KEYS);
    const g = (w: string) => words.findIndex((x) => x.includes(w));
    expect(gone.has(g('Grandma'))).toBe(gone.has(g('Mei')));
  });

  it('states are monotone and at least one word stays', () => {
    const fading = forgottenWords(TEXT, 'fading', 'm2', KEYS);
    const ghost = forgottenWords(TEXT, 'ghost', 'm2', KEYS);
    const lost = forgottenWords(TEXT, 'lost', 'm2', KEYS);
    for (const i of fading) expect(ghost.has(i)).toBe(true);
    for (const i of ghost) expect(lost.has(i)).toBe(true);
    expect(lost.size).toBeLessThan(words.length);
  });

  it('seeded: the same words go on every visit', () => {
    expect(forgottenWords(TEXT, 'ghost', 'm2', KEYS))
      .toEqual(forgottenWords(TEXT, 'ghost', 'm2', KEYS));
  });
});

describe('splitWord: punctuation stays', () => {
  it('keeps leading quotes and trailing stops out of the gap', () => {
    expect(splitWord('“Text')).toEqual(['“', 'Text', '']);
    expect(splitWord('Hangzhou,')).toEqual(['', 'Hangzhou', ',']);
    expect(splitWord('home.')).toEqual(['', 'home', '.']);
    expect(splitWord('kitchen')).toEqual(['', 'kitchen', '']);
  });
});
