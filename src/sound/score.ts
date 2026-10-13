// The garden's music (D27): a slow waltz in C, three beats to the bar, Satie-slow. Its melody only uses the
// flowers' own pentatonic (C D E G A), so a hovered flower's note always lands in tune. A clear garden plays a warm,
// slightly wistful progression; as fog gathers it turns to the same notes leaning toward dusk, and the melody thins.
// Pure: which chord, which bass, which melody note. `sound.ts` plays it.

export const TEMPO_BPM = 63;
export const BEATS_PER_BAR = 3;
export const BARS_PER_CHORD = 2;
/** Above this fog share (fading + ghost, of all memories) the next round of chords is the dusk progression. */
export const DUSK_AT = 0.35;

export type Chord = { name: string; pad: string[]; bass: string; melody: string[] };

/** A clear garden: IV – I – vi – V. */
export const BRIGHT: readonly Chord[] = [
  { name: 'Fmaj7', pad: ['F3', 'A3', 'C4', 'E4'], bass: 'F2', melody: ['A4', 'C5', 'E5', 'G5'] },
  { name: 'Cmaj7', pad: ['E3', 'G3', 'B3', 'D4'], bass: 'C3', melody: ['G4', 'C5', 'D5', 'E5'] },
  { name: 'Am7', pad: ['E3', 'G3', 'A3', 'C4'], bass: 'A2', melody: ['A4', 'C5', 'E5', 'G5'] },
  { name: 'G6', pad: ['D3', 'G3', 'B3', 'E4'], bass: 'G2', melody: ['G4', 'D5', 'E5', 'G5'] },
];

/** A foggy garden: vi – IV – ii – iii, the same notes at dusk. */
export const DUSK: readonly Chord[] = [
  { name: 'Am7', pad: ['E3', 'G3', 'A3', 'C4'], bass: 'A2', melody: ['A4', 'C5', 'E5'] },
  { name: 'Fmaj7', pad: ['F3', 'A3', 'C4', 'E4'], bass: 'F2', melody: ['A4', 'C5', 'E5'] },
  { name: 'Dm7', pad: ['F3', 'A3', 'C4', 'D4'], bass: 'D3', melody: ['A4', 'C5', 'D5'] },
  { name: 'Em7', pad: ['D3', 'G3', 'B3', 'E4'], bass: 'E3', melody: ['G4', 'D5', 'E5'] },
];

/** The progression for the next round of four chords. */
export const progressionFor = (fog: number): readonly Chord[] => (fog >= DUSK_AT ? DUSK : BRIGHT);

/** The chance that a beat carries a melody note: about two notes a bar in a clear garden, one every other bar in fog. */
export const melodyChance = (fog: number) => Math.max(0.12, 0.6 - 0.48 * Math.min(1, Math.max(0, fog)));

/**
 * The next melody note: a step up or down the chord's notes from the last one, rarely a leap, never the same note
 * twice. `r` is a random number in [0, 1).
 */
export function nextMelodyNote(pool: readonly string[], last: string | null, r: number): string {
  if (!pool.length) throw new Error('empty melody pool');
  const i = last === null ? -1 : pool.indexOf(last);
  if (i < 0) return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
  if (pool.length === 1) return pool[0];
  const step = r < 0.42 ? -1 : r < 0.84 ? 1 : r < 0.92 ? -2 : 2;
  let j = i + step;
  if (j < 0 || j >= pool.length) j = i - step;
  j = Math.min(pool.length - 1, Math.max(0, j));
  if (j === i) j = i === 0 ? 1 : i - 1;
  return pool[j];
}
