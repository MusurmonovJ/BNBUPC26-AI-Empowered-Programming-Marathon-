// The garden's music (D27): in tune with the flowers, darker in fog, and a melody that walks rather than jumps.
import { describe, expect, it } from 'vitest';
import { BRIGHT, DUSK, DUSK_AT, melodyChance, nextMelodyNote, progressionFor } from './score';

const PENTATONIC = /^[CDEGA][3-6]$/;

describe('the score', () => {
  it('every melody note is one of the flowers’ own notes, so a hover always lands in tune', () => {
    for (const chord of [...BRIGHT, ...DUSK]) for (const n of chord.melody) expect(n).toMatch(PENTATONIC);
  });

  it('four chords a round, each with a pad, a bass and a melody', () => {
    for (const p of [BRIGHT, DUSK]) {
      expect(p).toHaveLength(4);
      for (const c of p) { expect(c.pad.length).toBeGreaterThanOrEqual(3); expect(c.bass).toMatch(/^[A-G]b?[23]$/); expect(c.melody.length).toBeGreaterThanOrEqual(3); }
    }
  });

  it('turns to dusk as fog gathers, and the melody thins but never stops', () => {
    expect(progressionFor(0)).toBe(BRIGHT);
    expect(progressionFor(DUSK_AT - 0.01)).toBe(BRIGHT);
    expect(progressionFor(DUSK_AT)).toBe(DUSK);
    expect(melodyChance(0)).toBeGreaterThan(melodyChance(0.5));
    expect(melodyChance(0.5)).toBeGreaterThan(melodyChance(1));
    expect(melodyChance(1)).toBeGreaterThan(0);
    expect(melodyChance(-1)).toBe(melodyChance(0));
  });

  it('the melody steps along its chord, never repeats a note, and stays in the chord', () => {
    for (const chord of [...BRIGHT, ...DUSK]) {
      let last: string | null = null;
      for (let k = 0; k < 200; k++) {
        const r = (k * 0.6180339887) % 1;
        const next = nextMelodyNote(chord.melody, last, r);
        expect(chord.melody).toContain(next);
        if (last !== null && chord.melody.includes(last)) {
          expect(next).not.toBe(last);
          expect(Math.abs(chord.melody.indexOf(next) - chord.melody.indexOf(last))).toBeLessThanOrEqual(2);
        }
        last = next;
      }
    }
  });

  it('a note from the last chord that this chord lacks starts afresh inside it', () => {
    expect(BRIGHT[1].melody).toContain(nextMelodyNote(BRIGHT[1].melody, 'A4', 0.5));
  });
});
