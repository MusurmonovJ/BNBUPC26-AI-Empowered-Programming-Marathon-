// The garden's sound (systems.md § Sound), driven by the store and nothing else.
// A low drone that darkens as fog gathers, under a slow waltz (score.ts, D27) that turns toward dusk with it; each
// flower has its own pentatonic note, heard on hover; tending rings it and then its neighbours along their threads;
// a new thread resolves two notes into a chord; a lost memory's note bends down a minor third and fades. Opening a
// memory breathes its note in, a season passing is a wind of fog, and what holds a life sounds as a rising chord.
// Everything is quiet and slow: no note starts faster than 8ms.
//
// Browsers only allow audio after a gesture, so the first click or key press anywhere starts it (the threshold's
// click, or any click on a ?demo link). Tone.js makes its audio context the moment it is imported, so it is only
// imported inside that gesture: imported earlier, the browser would refuse the context and say so in the console.

import { hashSeed, holders, type Kind, type MemoryView } from '../engine';
import { useGarden } from '../store/garden';
import { BLOOM_MS } from '../scene/fx/bloomTimeline';
import { RIPPLE_TRAVEL_MS } from '../scene/thread/ThreadArc';
import { BARS_PER_CHORD, BEATS_PER_BAR, BRIGHT, melodyChance, nextMelodyNote, progressionFor, TEMPO_BPM, type Chord } from './score';

type Tone = typeof import('tone');

/** Pentatonic C D E G A; the octave says the kind (place low, sentence and photo mid, song high). */
const SCALE = ['C', 'D', 'E', 'G', 'A'];
const OCTAVE: Record<Kind, number> = { place: 3, sentence: 4, photo: 4, song: 5 };

/**
 * Levels in dB, raised for laptop speakers on 13 Oct (D27; P11.3 had set them for headphones). The tend chime stays
 * the loudest thing in the garden; the music sits under every event so each one is still heard.
 */
const LEVEL = {
  drone: -26, hover: -6, chime: -8, ripple: -18, chord: -16, lost: -18, landing: -23,
  pad: -32, bass: -27, melody: -23, open: -24, close: -29, plant: -27, wind: -21, holds: -13, title: -23, light: -18,
};
const BELL_GAIN = 9;
/** A return can lose many memories at once; past this many bending at the same moment, the rest stay silent. */
const LOST_VOICES = 3;
/** A safety net only: nothing in the mix should reach it. */
const CEILING = -3;
const DRONE_FADE_IN_S = 4;
/** The music waits for the garden to grow in, then fades in slowly. */
const MUSIC_AFTER_S = 2.5;
const MUSIC_FADE_IN_S = 8;
/** While the film holds still, or a season's losses play, the music steps back to this share. */
const MUSIC_QUIET = 0.35;
/** The drone follows the fog over this long, the same pace as a state change. */
const DRONE_FOLLOW_S = 3;
/** Clear garden → foggy garden: the drone's lowpass closes and its detuned second voice rises; the music darkens. */
const DRONE_CUTOFF = { clear: 900, fog: 220 };
const DRONE_SECOND = { clear: -40, fog: -8 };
const MUSIC_CUTOFF = { clear: 2400, fog: 900 };
const RIPPLE_GAP_S = 0.12;
const CHORD_RELEASE_S = 1.5;
const LOST_BEND_S = 2;
/** What holds a life: its memories' notes rising, this far apart. */
const HOLDS_GAP_S = 0.16;
/** A season passing: the fog's wind swells, sinks in pitch, and settles. */
const WIND = { rise: 2.5, hold: 3.5, fall: 5, from: 1100, to: 260 };
/** Hovering across many flowers quickly plays one note, not a run. */
const HOVER_GAP_MS = 140;

/** A memory's note, always the same for the same id. */
export function noteOf(id: string, kind: Kind): string {
  return `${SCALE[hashSeed(id) % SCALE.length]}${OCTAVE[kind]}`;
}
/** The same note, octaves up or down. */
const shift = (note: string, octaves: number) => note.slice(0, -1) + (Number(note.slice(-1)) + octaves);

/** Turning sound off or on fades over this long, never a click. */
const MUTE_FADE_S = 0.6;
const MUTE_KEY = 'lethe.sound';

/* ---------- sound on/off (P11.2), remembered in this browser ---------- */

let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === 'off'; } catch { return false; } })();
const listeners = new Set<() => void>();
let applyMute: ((m: boolean) => void) | null = null;

export const isMuted = () => muted;
export function onMuteChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function setMuted(m: boolean) {
  if (m === muted) return;
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? 'off' : 'on'); } catch { /* not remembered, still applied */ }
  applyMute?.(m);
  listeners.forEach((fn) => fn());
}

let started = false;

/** Start sound inside the first gesture (the browser lets a page start audio for a few seconds after one). */
export function startSound() {
  if (started || typeof AudioContext === 'undefined') return;
  started = true;
  void import('tone')
    .then(async (Tone) => { await Tone.start(); build(Tone); })
    .catch(() => { /* no sound: the garden is whole without it */ });
}

/** Start on the first click or key press anywhere. */
export function listenForFirstGesture() {
  const go = () => {
    removeEventListener('pointerdown', go, true);
    removeEventListener('keydown', go, true);
    startSound();
  };
  addEventListener('pointerdown', go, true);
  addEventListener('keydown', go, true);
}

function build(Tone: Tone) {
  // A linear gain, so turning sound off fades all the way to silence (a decibel ramp is exponential and never arrives).
  const ceiling = new Tone.Limiter(CEILING).toDestination();
  const out = new Tone.Gain(muted ? 0 : 1).connect(ceiling);
  applyMute = (m) => out.gain.rampTo(m ? 0 : 1, MUTE_FADE_S);
  const space = new Tone.Reverb({ decay: 7, preDelay: 0.04, wet: 0.38 }).connect(out);
  const gain = (db: number) => Tone.dbToGain(db);

  /* ---------- the drone ---------- */
  const filter = new Tone.Filter({ type: 'lowpass', frequency: DRONE_CUTOFF.clear, rolloff: -24, Q: 0.4 }).connect(space);
  const drone = new Tone.Gain(0).connect(filter);
  const first = new Tone.Oscillator({ frequency: 'C2', type: 'sine', volume: -6 }).connect(drone);
  const second = new Tone.Oscillator({ frequency: 'C2', type: 'sine', detune: 11, volume: DRONE_SECOND.clear }).connect(drone);
  const fifth = new Tone.Oscillator({ frequency: 'G2', type: 'sine', detune: -6, volume: -18 }).connect(drone);
  first.start(); second.start(); fifth.start();
  drone.gain.rampTo(gain(LEVEL.drone), DRONE_FADE_IN_S);

  /* ---------- the music (score.ts) ---------- */
  const music = new Tone.Gain(0).connect(space);
  const musicTone = new Tone.Filter({ type: 'lowpass', frequency: MUSIC_CUTOFF.clear, rolloff: -12, Q: 0.3 }).connect(music);
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fattriangle', count: 2, spread: 14 }, envelope: { attack: 1.8, decay: 1.2, sustain: 0.65, release: 3.8 },
  }).connect(musicTone);
  pad.maxPolyphony = 12;
  const keys = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2, modulationIndex: 1.1, oscillator: { type: 'sine' }, envelope: { attack: 0.012, decay: 2, sustain: 0.08, release: 2.6 },
    modulation: { type: 'triangle' }, modulationEnvelope: { attack: 0.012, decay: 0.5, sustain: 0, release: 0.8 },
  }).connect(musicTone);
  keys.maxPolyphony = 8;
  const bass = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.04, decay: 1.8, sustain: 0.3, release: 2.2 } }).connect(musicTone);
  const musicLevel = () => (useGarden.getState().presentation.quiet || useGarden.getState().replaying ? MUSIC_QUIET : 1);
  music.gain.setValueAtTime(0, Tone.now());
  music.gain.linearRampToValueAtTime(musicLevel(), Tone.now() + MUSIC_AFTER_S + MUSIC_FADE_IN_S);

  let fog = 0;
  let round: readonly Chord[] = BRIGHT;
  let melodyNote: string | null = null;
  let beat = 0;
  const beatS = 60 / TEMPO_BPM;
  // Its own clock, not the Transport: one tick a beat, each note placed at the tick's exact audio time.
  const pulse = new Tone.Clock((time) => {
    const inBar = beat % BEATS_PER_BAR;
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const index = Math.floor(bar / BARS_PER_CHORD) % 4;
    const chordStarts = inBar === 0 && bar % BARS_PER_CHORD === 0;
    if (chordStarts && index === 0) round = progressionFor(fog);
    const chord = round[index];
    if (chordStarts) pad.triggerAttackRelease(chord.pad, beatS * BEATS_PER_BAR * BARS_PER_CHORD + 0.4, time, gain(LEVEL.pad));
    if (inBar === 0) bass.triggerAttackRelease(chord.bass, beatS * 2.6, time, gain(LEVEL.bass));
    // The melody waits while a season's losses are heard, and walks slower in fog.
    if (!useGarden.getState().replaying && Math.random() < melodyChance(fog)) {
      melodyNote = nextMelodyNote(chord.melody, melodyNote, Math.random());
      const held = inBar === 0 ? beatS * 2.4 : beatS * 1.3;
      keys.triggerAttackRelease(melodyNote, held, time + Math.random() * 0.03, gain(LEVEL.melody) * (0.8 + 0.2 * Math.random()));
    }
    beat++;
  }, TEMPO_BPM / 60);
  pulse.start(Tone.now() + MUSIC_AFTER_S);

  const follow = (shown: Record<string, MemoryView>) => {
    const views = Object.values(shown);
    fog = views.length ? views.filter((v) => v.state === 'fading' || v.state === 'ghost').length / views.length : 0;
    filter.frequency.rampTo(DRONE_CUTOFF.clear + (DRONE_CUTOFF.fog - DRONE_CUTOFF.clear) * fog, DRONE_FOLLOW_S);
    second.volume.rampTo(DRONE_SECOND.clear + (DRONE_SECOND.fog - DRONE_SECOND.clear) * fog, DRONE_FOLLOW_S);
    musicTone.frequency.rampTo(MUSIC_CUTOFF.clear + (MUSIC_CUTOFF.fog - MUSIC_CUTOFF.clear) * fog, DRONE_FOLLOW_S);
  };

  /* ---------- notes ---------- */
  const soft = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.06, decay: 0.4, sustain: 0.25, release: 1.6 },
  }).connect(space);
  soft.maxPolyphony = 16;
  const bell = new Tone.PolySynth(Tone.FMSynth, {
    volume: BELL_GAIN, harmonicity: 3.01, modulationIndex: 2.2, oscillator: { type: 'sine' },
    envelope: { attack: 0.008, decay: 1.4, sustain: 0, release: 2.4 },
    modulation: { type: 'sine' }, modulationEnvelope: { attack: 0.008, decay: 0.6, sustain: 0, release: 1 },
  }).connect(space);
  bell.maxPolyphony = 12;
  // Hover: a small glass note, bright enough to hear on a laptop, gone in a second.
  const glass = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 4, modulationIndex: 1.4, oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.9, sustain: 0, release: 1.4 },
    modulation: { type: 'sine' }, modulationEnvelope: { attack: 0.01, decay: 0.25, sustain: 0, release: 0.5 },
  }).connect(space);
  glass.maxPolyphony = 12;
  // Opening, planting, a title: a slow breath, never a strike.
  const breath = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' }, envelope: { attack: 0.35, decay: 0.9, sustain: 0.3, release: 2.4 },
  }).connect(space);
  breath.maxPolyphony = 10;

  const kindOf = (id: string) => useGarden.getState().garden.memories[id]?.kind;
  const at = (performanceMs: number) => Tone.now() + Math.max(0, (performanceMs - performance.now()) / 1000);
  const play = (synth: typeof soft | typeof bell, notes: string[], dur: number, db: number, when = Tone.now()) =>
    synth.triggerAttackRelease(notes, dur, when, gain(db));

  let lastHover = 0;
  const hover = (id: string) => {
    const kind = kindOf(id);
    if (!kind || performance.now() - lastHover < HOVER_GAP_MS) return;
    lastHover = performance.now();
    const note = noteOf(id, kind);
    play(glass, [note], 0.5, LEVEL.hover);
    play(soft, [shift(note, 1)], 0.4, LEVEL.hover - 12, Tone.now() + 0.05);
  };

  // Opening a memory breathes its note in with the fifth above; going back lets one low note go.
  const open = (id: string) => {
    const kind = kindOf(id);
    if (!kind) return;
    const note = noteOf(id, kind);
    play(breath, [note, Tone.Frequency(note).transpose(7).toNote()], 1.4, LEVEL.open);
  };
  const close = (id: string) => {
    const kind = kindOf(id);
    if (kind) play(breath, [shift(noteOf(id, kind), -1)], 0.8, LEVEL.close);
  };

  // Tend: the flower's chime, then each neighbour's note 120ms apart, as the ripple runs along its threads.
  const chime = (id: string, whenMs: number) => {
    const kind = kindOf(id);
    if (kind) play(bell, [noteOf(id, kind)], 0.9, LEVEL.chime, at(whenMs));
  };
  const ripple = (ids: string[], tendMs: number) => ids.forEach((n, i) => {
    const k = kindOf(n);
    if (k) play(bell, [noteOf(n, k)], 0.6, LEVEL.ripple, at(tendMs) + (i + 1) * RIPPLE_GAP_S);
  });

  const landing = (id: string, whenMs: number) => {
    const kind = kindOf(id);
    if (kind) play(soft, [noteOf(id, kind)], 0.35, LEVEL.landing, at(whenMs));
  };

  // A new memory's threads (or a returned one's, re-forming): when the first light reaches the neighbours (P6.4),
  // its note and theirs sound together.
  const chord = (id: string, whenMs: number) => {
    const g = useGarden.getState().garden;
    const kind = kindOf(id);
    const others = g.threads.flatMap((t) => (t.a === id ? [t.b] : t.b === id ? [t.a] : []));
    if (!kind || !others.length) return;
    const notes = [noteOf(id, kind), ...others.flatMap((o) => { const k = kindOf(o); return k ? [noteOf(o, k)] : []; })];
    const chordNotes = [...new Set(notes)].slice(0, 4);
    // Notes add up: each one is quieter as the chord grows, so a chord of four is no louder than a chord of two.
    play(soft, chordNotes, CHORD_RELEASE_S, LEVEL.chord - 20 * Math.log10(Math.max(2, chordNotes.length) / 2), at(whenMs));
  };

  // Lost: the note bends down a minor third over 2s while it fades. One short-lived voice per loss, at most
  // LOST_VOICES at once.
  let bending: number[] = [];
  const lost = (id: string, whenMs: number) => {
    const kind = kindOf(id);
    if (!kind) return;
    bending = bending.filter((end) => end > whenMs);
    if (bending.filter((end) => end - LOST_BEND_S * 1000 <= whenMs).length >= LOST_VOICES) return;
    bending.push(whenMs + LOST_BEND_S * 1000);
    const v = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.3, decay: 0, sustain: 1, release: 0.4 } }).connect(space);
    const t0 = at(whenMs);
    const f = Tone.Frequency(noteOf(id, kind)).toFrequency();
    v.volume.setValueAtTime(LEVEL.lost, t0);
    v.triggerAttack(f, t0);
    v.frequency.setValueAtTime(f, t0);
    v.frequency.exponentialRampToValueAtTime(f * 2 ** (-3 / 12), t0 + LOST_BEND_S);
    v.volume.linearRampToValueAtTime(-60, t0 + LOST_BEND_S);
    v.triggerRelease(t0 + LOST_BEND_S);
    setTimeout(() => v.dispose(), (t0 - Tone.now() + LOST_BEND_S + 1) * 1000);
  };

  // A season passing: the fog's wind, pink noise through a band that sinks as it settles. Built per season.
  const wind = () => {
    const t0 = Tone.now();
    const band = new Tone.Filter({ type: 'bandpass', frequency: WIND.from, Q: 0.9 }).connect(space);
    const swell = new Tone.Gain(0).connect(band);
    const noise = new Tone.Noise('pink').connect(swell);
    noise.start(t0);
    swell.gain.setValueAtTime(0, t0);
    swell.gain.linearRampToValueAtTime(gain(LEVEL.wind), t0 + WIND.rise);
    swell.gain.setValueAtTime(gain(LEVEL.wind), t0 + WIND.rise + WIND.hold);
    swell.gain.linearRampToValueAtTime(0, t0 + WIND.rise + WIND.hold + WIND.fall);
    band.frequency.exponentialRampToValueAtTime(WIND.to, t0 + WIND.rise + WIND.hold + WIND.fall);
    const end = WIND.rise + WIND.hold + WIND.fall;
    noise.stop(t0 + end + 0.1);
    setTimeout(() => { noise.dispose(); swell.dispose(); band.dispose(); }, (end + 1) * 1000);
  };

  // What holds a life: the holder's memories' notes, low to high, rising together like a chord being remembered.
  const holds = (entityId: string | null) => {
    const s = useGarden.getState();
    const h = holders(s.garden, s.now()).find((x) => x.entityId === entityId) ?? holders(s.garden, s.now())[0];
    if (!h) return;
    const notes = [...new Set(h.memories.flatMap((id) => { const k = kindOf(id); return k ? [noteOf(id, k)] : []; }))]
      .sort((a, b) => Tone.Frequency(a).toFrequency() - Tone.Frequency(b).toFrequency()).slice(0, 6);
    notes.forEach((n, i) => play(glass, [n], 1.6, LEVEL.holds, Tone.now() + 0.2 + i * HOLDS_GAP_S));
  };

  /* ---------- follow the store ---------- */
  const heard = new WeakSet<object>();

  follow(useGarden.getState().shown);
  useGarden.subscribe((s, prev) => {
    if (s.presentation.quiet !== prev.presentation.quiet) drone.gain.rampTo(gain(LEVEL.drone) * (s.presentation.quiet ? 0.45 : 1), 2);
    if (s.presentation.quiet !== prev.presentation.quiet || s.replaying !== prev.replaying) music.gain.rampTo(musicLevel(), 2.5);
    if (s.shown !== prev.shown) follow(s.shown);
    if (s.hoveredId && s.hoveredId !== prev.hoveredId) hover(s.hoveredId);
    if (s.focusedId !== prev.focusedId) {
      if (s.focusedId) open(s.focusedId);
      else if (prev.focusedId) close(prev.focusedId);
    }
    if (s.planting !== 'closed' && prev.planting === 'closed') play(breath, ['C4', 'G4'], 1, LEVEL.plant);
    if (s.replaying && !prev.replaying) wind();
    if (s.reveal.open && (!prev.reveal.open || s.reveal.entityId !== prev.reveal.entityId)) holds(s.reveal.entityId);
    if (s.presentation.holderId && s.presentation.holderId !== prev.presentation.holderId) holds(s.presentation.holderId);
    // The film's title cards: a low breath under each turning point.
    if (s.story.title && s.story.title !== prev.story.title) play(breath, ['C3', 'G3', 'E4'], 2.6, LEVEL.title);
    // Light gained (a new day, or continuing a season), not a whole new garden.
    if (s.generation === prev.generation && s.garden.light > prev.garden.light) {
      play(glass, ['E6'], 0.5, LEVEL.light); play(glass, ['A6'], 0.7, LEVEL.light, Tone.now() + 0.14);
    }

    if (s.events !== prev.events) {
      const fresh = s.events.filter((e) => !heard.has(e));
      fresh.forEach((e) => heard.add(e));
      for (const e of fresh) {
        if (e.type === 'tend') chime(e.id, e.at);
        // The garden growing in: each flower's own note as its seed lands, a pentatonic cascade, never a pile of chords.
        if (e.type === 'bloom' && e.quiet) landing(e.id, e.at + BLOOM_MS.land);
        else if (e.type === 'bloom') chord(e.id, e.at + BLOOM_MS.settle + RIPPLE_TRAVEL_MS);
        if (e.type === 'dissolve') lost(e.id, e.at);
      }
      // The store sends the ripple just after its tend: the neighbours follow the latest chime.
      const rippled = fresh.filter((e) => e.type === 'ripple').map((e) => e.id);
      const lastTend = s.events.filter((e) => e.type === 'tend').at(-1);
      if (rippled.length && lastTend) ripple(rippled, lastTend.at);
    }
  });
}
