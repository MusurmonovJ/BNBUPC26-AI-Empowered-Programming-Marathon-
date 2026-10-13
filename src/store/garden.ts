// The one store shared by the 3D scene and the DOM interface.
// It owns the Garden (your own one is kept in this browser, see persist.ts), where planted flowers stand, the
// clock, and the planting draft. Every action clones the garden, runs an engine function, and replaces it, so React
// and R3F see a new reference.

import { create } from 'zustand';
import {
  advance, canPlant, canReturn, canTend, C, emptyGarden, gardenNow, holders, letGo, neighbours, plant, retag, returnTo, tend, viewAll, visit,
  type Garden, type Kind, type MemoryView, type ReturnSummary,
} from '../engine';
import type { Tags } from '../engine/garden';
import { FIRST_PLANTING_PLACES, layoutOf, placeNew, type Place } from '../data/placement';
import { FIRST_PROMPTS, sampleGarden } from '../data/sample';
import { stressGarden } from '../data/stress';
import { CLOSING_LINES, episodeGarden, EPISODE_CHOICES, EPISODE_CHOICE_LINE, EPISODE_DAY, EPISODE_DAYS, EPISODE_PLACES, type EpisodeChoice } from '../data/episode';
import { offlineTag } from '../tagging/offline';
import { apiTag, type TagSource } from '../tagging/tag';
import { dominantColor } from '../ui/photo';
import { ALONE_WHISPER, RULE_WHISPER, nameOf } from '../ui/whispers';
import { sceneReady } from './sceneReady';
import { forget, keep, load, markKept } from './persist';
import { onPresentationResume, presentationClock } from './presentationClock';

type Clock = { debugOffset: number };
type DraftTags = { people: Tags; places: Tags; feelings: Tags };

/** A memory being written in the plant overlay (screens p4–p6). */
export type Draft = {
  choice?: EpisodeChoice;
  kind: Kind;
  text: string;
  /** Photo memories: the chosen image (written with the garden once planted) and its colour. */
  photoId?: string;
  hue?: string;
  tags: DraftTags | null;
  source: TagSource | null;
  /** Names the person removed from "threads it could join"; a later provider answer never brings them back. */
  dropped: string[];
  /** Where it will grow; the seed waits there while it is written. */
  place: Place;
};

export type PlantingStep = 'closed' | 'kind' | 'field' | 'choices';
export type Episode = {
  mode: 'play' | 'film';
  stage: 'exploring' | 'passing' | 'reflecting' | 'finished';
  day: number;
  plantingUsed: boolean;
  continued: boolean;
  extraPlants: number;
  tended: string[];
  planted: string[];
  returned: string[];
  letGo: string[];
  before: Record<string, MemoryView>;
  after: Record<string, MemoryView>;
  summary: ReturnSummary | null;
};
export type Presentation = { overview: boolean; holderId: string | null; headId: string | null; quiet: boolean; line: string | null };
const NO_PRESENTATION: Presentation = { overview: false, holderId: null, headId: null, quiet: false, line: null };
const freshEpisode = (mode: Episode['mode']): Episode => ({
  mode, stage: 'exploring', day: EPISODE_DAY, plantingUsed: false, continued: false, extraPlants: 0,
  tended: [], planted: [], returned: [], letGo: [], before: {}, after: {}, summary: null,
});

export function episodeReflection(garden: Garden, episode: Episode): string {
  const returned = episode.returned.at(-1);
  if (returned && garden.memories[returned] && !garden.memories[returned].lost) return `you returned to ${nameOf(garden.memories[returned]).toLowerCase()}.`;
  if (episode.planted.includes('ep-choice-rooftop') && garden.threads.some((t) =>
    [t.a, t.b].includes('m10') && [t.a, t.b].includes('ep-choice-rooftop'))) return 'the rooftop found a thread to leo.';
  const tended = episode.tended.at(-1);
  if (tended === 'm1') return 'you tended grandma mei’s words.';
  if (tended && garden.memories[tended]) return `you tended ${nameOf(garden.memories[tended]).toLowerCase()}.`;
  const planted = episode.planted.at(-1);
  if (planted && garden.memories[planted]) return 'a new memory found its place in this life.';
  return 'the garden has changed. what remains still belongs to this life.';
}

onPresentationResume((duration) => {
  const s = useGarden.getState();
  if (!s.episode || !duration) return;
  // Animation events use wall performance time; shift them alongside the paused presentation clock.
  // Keep event object identity, so the sound system does not replay previously heard events.
  for (const e of s.events) e.at += duration;
  useGarden.setState({ events: [...s.events] });
});
/** Where the person is: the threshold (screen p7), the first plantings (p8–p10), or the garden itself. */
export type Phase = 'threshold' | 'first' | 'garden';

type GardenStore = {
  episode: Episode | null;
  generation: number;
  plantingPending: boolean;
  presentation: Presentation;
  /**
   * Start the fictional episode. With `prepareMs`, it is prepared behind the threshold while that fades: the phase
   * stays, and its seeds wait in the dark until `prepareMs` has passed; `openEpisode` then opens it without a reset.
   */
  beginEpisode: (mode: Episode['mode'], prepareMs?: number) => void;
  openEpisode: () => void;
  selectEpisodeChoice: (choice: EpisodeChoice) => void;
  plantEpisodeChoice: (choice: EpisodeChoice) => Promise<string | null>;
  advanceEpisode: () => void;
  finishEpisode: () => void;
  continueEpisode: () => void;
  restartEpisode: () => void;
  setPresentation: (patch: Partial<Presentation>) => void;
  stopPresentation: () => void;
  garden: Garden;
  clock: Clock;
  views: Record<string, MemoryView>;
  /**
   * What the 3D garden shows. Usually the same as `views`; during the return replay it starts as the garden was
   * before the time away and moves to `views` one memory at a time (P7.1).
   */
  shown: Record<string, MemoryView>;
  replaying: boolean;
  /** Where each planted (non-sample) memory stands on the design canvas. */
  positions: Record<string, Place>;
  /** Photo blobs by photoId, with an object URL for showing them. */
  photos: Record<string, { blob: Blob; url: string }>;
  hoveredId: string | null;
  focusedId: string | null;
  returnSummary: ReturnSummary | null;
  /** Which tagger tagged each memory planted this session (for checking the providers on the live site). */
  tagSources: Record<string, TagSource>;
  /** Ids that just bloomed or were tended, for one-shot animations. */
  /** `quiet`: the garden growing in on entry (no new-thread chord; each flower sounds its note as it lands). */
  events: { type: 'bloom' | 'tend' | 'ripple' | 'dissolve' | 'beckon'; id: string; at: number; quiet?: boolean }[];
  planting: PlantingStep;
  phase: Phase;
  /** Whose garden is on screen: your own (kept in this browser) or the demo garden (never kept). */
  owner: 'own' | 'demo';
  /** Which first-planting prompt is showing (index into FIRST_PROMPTS). */
  promptIndex: number;
  /** A line the garden says over everything else for a moment ("A season passes."). */
  whisperOverride: string | null;
  /** "What holds your garden" (P9, screen p12): open, and which person or place is lit. */
  reveal: { open: boolean; entityId: string | null };
  /** The settings overlay (P10.2), opened from "lethe" top-left. */
  settings: boolean;
  /** "watch a season" (D20): the garden plays its own story, and says one line at a time beneath it. */
  /** The film: whether it plays, its caption, and a title card in the sky for its turning points. */
  story: { running: boolean; line: string | null; title?: string | null };
  draft: Draft | null;

  now: () => number;
  refresh: () => void;
  setDebugOffset: (gardenDays: number) => void;
  hover: (id: string | null) => void;
  focus: (id: string | null) => void;
  tendMemory: (id: string) => void;
  letGoMemory: (id: string) => void;
  returnToMemory: (id: string) => void;
  plantMemory: (kind: Kind, text: string, extra?: {
    hue?: string; photoId?: string; place?: Place; tags?: DraftTags; tagSource?: TagSource; dropped?: string[]; choice?: EpisodeChoice;
  }) => Promise<string | null>;
  arrive: () => void;
  /** Hidden slider: put the ten sample memories back as they were. */
  resetDemo: () => void;
  /** Threshold: return to your kept garden if this browser has one, otherwise begin it with the first plantings. */
  enterOwn: () => Promise<void>;
  /** Threshold: begin your own garden, empty, with the first plantings. */
  beginOwn: () => void;
  /** Threshold: see the demo garden (the ten sample memories). */
  seeDemo: () => void;
  /**
   * Threshold, at the click: reset the demo garden while the threshold is still fading, its seeds waiting in the
   * dark until `afterMs` has passed. `openDemo` then opens it without resetting it again.
   */
  prepareDemo: (afterMs: number) => void;
  openDemo: () => void;
  /** First plantings: plant the current prompt's memory, or skip it. */
  plantPrompt: (text: string, photo?: File) => Promise<void>;
  skipPrompt: () => void;
  /** The reveal: open it (lighting what holds the most), choose a person or place, close it. */
  openReveal: () => void;
  selectHolder: (entityId: string) => void;
  closeReveal: () => void;
  /** Settings: open or close it; let the garden go empties this browser and returns to the threshold. */
  openSettings: () => void;
  closeSettings: () => void;
  letGardenGo: () => Promise<void>;
  /** The story's state; `src/ui/story.ts` runs it and calls the store's actions like a person would. */
  setStory: (patch: Partial<GardenStore['story']>) => void;

  openPlanting: (step?: Exclude<PlantingStep, 'closed'>, kind?: Kind) => void;
  closePlanting: () => void;
  setDraftKind: (kind: Kind) => void;
  setDraftText: (text: string) => void;
  setDraftPhoto: (file: File) => Promise<void>;
  dropDraftTag: (name: string) => void;
  /** Tag the draft: offline at once, then the provider in the background. Called by the overlay after a pause in typing. */
  tagDraft: () => Promise<void>;
  plantDraft: () => Promise<string | null>;
  canPlantNow: () => boolean;
};

const realNow = () => Date.now();
/** ?days=N previews the garden N garden days ahead (same as the hidden slider). For demos and screenshots. */
const urlDays = typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('days')) || 0 : 0;
/** ?stress=N (P12.1): open a seeded garden of N memories instead of the demo, to check the frame rate. */
const urlStress = typeof location !== 'undefined' ? Math.min(400, Number(new URLSearchParams(location.search).get('stress')) || 0) : 0;
/** ?demo (or any preview/sandbox/stress link) opens straight into the garden; otherwise the threshold comes first. */
const demoMode = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('demo') : null;
const startPhase: Phase = demoMode === 'film' ? 'threshold' : typeof location !== 'undefined' && /[?&](demo|days|sandbox|stress)\b/.test(location.search) ? 'garden' : 'threshold';
/** "A season passes" (P8.3): after the first plantings, this many garden days go by, shown with the return replay. */
const SEASON_DAYS = 10;
/** Let the last bloom finish and the line be read before the season passes. */
const SEASON_AFTER_MS = 2800;
const SEASON_LINE_MS = 3200;
let seasonTimer: ReturnType<typeof setTimeout> | null = null;
/** A line the garden says once (the rule), and its timer. Only this line is ever hushed early. */
let saying: string | null = null;
let sayTimer: ReturnType<typeof setTimeout> | null = null;
/** The rule is said when the demo garden opens; a memory planted alone hears it once its bloom has settled. */
const RULE_FOR_MS = 7000;
const ALONE_AFTER_MS = 2400;
/**
 * Entering the demo garden, it grows in: each seed falls and blooms, left to right, 160ms apart (the bloom's own
 * beats), and the threads light once both their flowers have grown. On a ?demo link the wait is longer, so the
 * first frame has been drawn before the first seed falls.
 */
const GROW_IN_AFTER_MS = 450;
/** A ?demo link grows in once the scene's shaders are compiled, and never waits longer than this. */
const SCENE_READY_MAX_MS = 4000;
const GROW_IN_STAGGER_MS = 160;
const isDemoLink = typeof location !== 'undefined' && /[?&]demo\b/.test(location.search);
let nextId = 0;
const newId = (prefix = 'm') => `${prefix}${Date.now().toString(36)}${(nextId++).toString(36)}`;
const dropTags = (tags: DraftTags, dropped: string[]): DraftTags => {
  const keep = (t: Tags) => t.filter((x) => !dropped.includes(x.name.toLowerCase()));
  return { people: keep(tags.people), places: keep(tags.places), feelings: keep(tags.feelings) };
};
/** Only one draft tagging request at a time; a newer pause in typing aborts the older one. */
let draftRequest: AbortController | null = null;

/** The return replay (P7.1): how far apart memories change, and when a lost one starts to dissolve or a ghost beckons. */
const REPLAY_STAGGER_MS = 260;
const REPLAY_TICK_MS = 120;
const DISSOLVE_AFTER_MS = 1500;
const BECKON_AFTER_MS = 3000;
/** The kept garden, read once at start while the threshold shows (preview and demo links never read it). */
let kept = load();
let episodeTimer: ReturnType<typeof setInterval> | null = null;
const stopEpisodeTimer = () => { if (episodeTimer) clearInterval(episodeTimer); episodeTimer = null; };

let replayTimer: ReturnType<typeof setInterval> | null = null;
const stopReplay = () => { if (replayTimer) clearInterval(replayTimer); replayTimer = null; };

export const useGarden = create<GardenStore>((set, get) => {
  const stress = urlStress ? stressGarden(urlStress, 100, realNow()) : null;
  const startingEpisode = demoMode === 'play' ? episodeGarden(realNow()) : null;
  const initial = startingEpisode?.garden ?? stress?.garden ?? sampleGarden(100, realNow());
  // Any change to the garden ends a replay: the garden shows what is true now.
  const withViews = (g: Garden, now: number) => {
    stopReplay();
    const views = viewAll(g, now);
    return { garden: g, views, shown: views, replaying: false };
  };
  const mutate = (fn: (g: Garden, now: number) => void) => {
    const g = structuredClone(get().garden);
    const now = get().now();
    fn(g, now);
    set(withViews(g, now));
  };
  /**
   * The hidden slider only previews. Acting while it is moved forward first commits the previewed time as a
   * proper return visit (light, losses, summary), so no action ever writes timestamps from a preview.
   */
  const commitPreview = () => { if (get().clock.debugOffset !== 0) get().arrive(); };
  const episodeEditable = () => !get().episode || get().episode?.stage === 'exploring' || (get().episode?.stage === 'finished' && get().episode?.continued);
  const remember = (field: 'tended' | 'planted' | 'returned' | 'letGo', id: string) => {
    const e = get().episode;
    if (e) set({ episode: { ...e, [field]: [...new Set([...e[field], id])] } });
  };
  const cancelSession = () => {
    hush(); stopReplay(); stopEpisodeTimer();
    if (seasonTimer) clearTimeout(seasonTimer);
    seasonTimer = null;
    draftRequest?.abort();
    set({ generation: get().generation + 1, episode: null, plantingPending: false,
      story: { running: false, line: null, title: null }, presentation: { ...NO_PRESENTATION } });
  };
  const emit = (type: GardenStore['events'][number]['type'], ids: string[], at: (id: string) => number = () => performance.now()) =>
    set((s) => ({ events: [...s.events.filter((e) => performance.now() - e.at < 8000), ...ids.map((id) => ({ type, id, at: at(id) }))] }));
  /** The next free spot in the garden, for a memory about to be planted. */
  const nextPlace = () => {
    const e = get().episode;
    if (e) return e.continued ? EPISODE_PLACES.extra[Math.min(e.extraPlants, 2)] : EPISODE_PLACES.custom;
    const { garden, positions } = get();
    const ids = Object.keys(garden.memories);
    return placeNew(Object.values(layoutOf(ids, positions)), ids.length * 7 + 3);
  };
  /** Next first-planting prompt; after the last, the garden opens and a season passes (P8.3). */
  const advancePrompt = () => {
    const next = get().promptIndex + 1;
    if (next < FIRST_PROMPTS.length) { set({ promptIndex: next }); return; }
    set({ phase: 'garden', promptIndex: next });
    if (!Object.keys(get().garden.memories).length) return; // nothing planted: no season to show
    if (seasonTimer) clearTimeout(seasonTimer);
    set({ whisperOverride: 'A season passes.' });
    seasonTimer = setTimeout(() => {
      get().setDebugOffset(SEASON_DAYS);
      get().arrive();
      seasonTimer = setTimeout(() => set({ whisperOverride: null }), SEASON_LINE_MS);
    }, SEASON_AFTER_MS);
  };
  /** Say a line over the usual whisper for a while (never over the season's line), then let the usual one return. */
  const say = (line: string, afterMs = 0, forMs = RULE_FOR_MS) => {
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      if (get().whisperOverride && get().whisperOverride !== saying) return;
      saying = line;
      set({ whisperOverride: line });
      sayTimer = setTimeout(hush, forMs);
    }, afterMs);
  };
  /** Stop a said line (an arrive, a reset): the return whisper or the idle one takes over. */
  const hush = () => {
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = null;
    if (saying && get().whisperOverride === saying) set({ whisperOverride: null });
    saying = null;
  };
  // A judge's link (?demo) grows the garden in and opens on the rule, before anything else is said. Its seeds wait
  // in the dark while the scene compiles its shaders (sceneReady), so the first bloom never stutters.
  if (isDemoLink && demoMode !== 'film') {
    setTimeout(() => {
      const generation = get().generation;
      growIn(SCENE_READY_MAX_MS);
      void Promise.race([sceneReady, new Promise((r) => setTimeout(r, SCENE_READY_MAX_MS))])
        .then(() => { if (get().generation !== generation) return; growIn(GROW_IN_AFTER_MS); say(get().episode ? EPISODE_CHOICE_LINE : RULE_WHISPER); });
    }, 0);
  }
  /** The garden grows in: one quiet bloom per memory, left to right across the canvas. */
  const growIn = (afterMs: number) => {
    const ids = Object.keys(get().garden.memories);
    const layout = layoutOf(ids, get().positions);
    const order = [...ids].sort((a, b) => layout[a].x - layout[b].x);
    const t0 = performance.now() + afterMs;
    set({ events: order.map((id, i) => ({ type: 'bloom' as const, id, at: t0 + i * GROW_IN_STAGGER_MS, quiet: true })) });
  };
  const setDraft = (patch: Partial<Draft>) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {}));

  const initialViews = viewAll(initial, 100 + urlDays);
  return {
    episode: startingEpisode ? freshEpisode('play') : null,
    generation: 0,
    plantingPending: false,
    presentation: { ...NO_PRESENTATION },
    beginEpisode: (mode, prepareMs) => {
      cancelSession();
      const { garden, positions } = episodeGarden(realNow());
      const views = viewAll(garden, EPISODE_DAY);
      const prepared = prepareMs !== undefined;
      set({ garden, positions, views, shown: views, episode: freshEpisode(mode), owner: 'demo', ...(prepared ? {} : { phase: 'garden' as const }),
        clock: { debugOffset: 0 }, events: [], returnSummary: null, hoveredId: null, focusedId: null, whisperOverride: null,
        planting: 'closed', draft: null, settings: false, reveal: { open: false, entityId: null }, tagSources: {} });
      const generation = get().generation;
      const started = performance.now();
      growIn(SCENE_READY_MAX_MS + (prepareMs ?? 0));
      void Promise.race([sceneReady, new Promise((r) => setTimeout(r, SCENE_READY_MAX_MS))]).then(() => {
        if (get().generation !== generation) return;
        // Behind the threshold, the seeds fall just as it finishes fading.
        growIn(Math.max(0, (prepareMs ?? 0) - (performance.now() - started)) + GROW_IN_AFTER_MS);
        if (!prepared && mode === 'play') say(EPISODE_CHOICE_LINE);
      });
    },
    openEpisode: () => {
      const e = get().episode;
      if (!e) return;
      set({ phase: 'garden' });
      if (e.mode === 'play') say(EPISODE_CHOICE_LINE);
    },
    selectEpisodeChoice: (choice) => {
      if (!get().episode || !get().canPlantNow()) return;
      const m = EPISODE_CHOICES[choice];
      set({ planting: 'field', focusedId: null, settings: false, reveal: { open: false, entityId: null },
        draft: { choice, kind: m.kind, text: m.text, photoId: undefined, tags: { people: m.people, places: m.places, feelings: [] },
          source: 'offline', dropped: [], place: EPISODE_PLACES[choice] } });
    },
    plantEpisodeChoice: async (choice) => {
      if (!get().episode) return null;
      const m = EPISODE_CHOICES[choice];
      return get().plantMemory(m.kind, m.text, { choice, place: EPISODE_PLACES[choice],
        tags: { people: m.people, places: m.places, feelings: [] } });
    },
    advanceEpisode: () => {
      const e = get().episode;
      if (!e || e.stage !== 'exploring' || get().plantingPending) return;
      hush(); stopReplay(); stopEpisodeTimer(); draftRequest?.abort();
      const before = viewAll(get().garden, e.day);
      const g = structuredClone(get().garden);
      const day = e.day + EPISODE_DAYS;
      const summary = advance(g, e.day, day);
      const views = viewAll(g, day);
      const changed = Object.keys(views).filter((id) => views[id].state !== before[id].state || Math.abs(views[id].vitality - before[id].vitality) > 0.02);
      // Frame the rooftop first if it really is lost; all other changes remain real engine outcomes.
      changed.sort((a, b) => Number(b === 'm10') - Number(a === 'm10'));
      const wallStart = performance.now() + 400;
      const activeStart = presentationClock.now();
      const offset = (id: string) => 400 + Math.max(0, changed.indexOf(id)) / Math.max(1, changed.length - 1) * 1200;
      set({ garden: g, views, shown: before, replaying: true, episode: { ...e, stage: 'passing', day, before, after: views, summary },
        returnSummary: summary, planting: 'closed', draft: null, settings: false, reveal: { open: false, entityId: null },
        presentation: { ...NO_PRESENTATION, headId: summary.lost.includes('m10') ? 'm10' : null,
          line: e.mode === 'play' ? 'a season passes. some moments settle into dusk.' : null } });
      emit('dissolve', summary.lost, (id) => wallStart + offset(id) - 400 + DISSOLVE_AFTER_MS);
      emit('beckon', summary.aboutToBeLost, (id) => wallStart + offset(id) - 400 + BECKON_AFTER_MS);
      const generation = get().generation;
      episodeTimer = setInterval(() => {
        if (get().generation !== generation) { stopEpisodeTimer(); return; }
        const age = presentationClock.now() - activeStart;
        const due = changed.filter((id) => age >= offset(id));
        set({ shown: { ...before, ...Object.fromEntries(due.map((id) => [id, views[id]])) } });
        if (age < 8000) return;
        stopEpisodeTimer();
        set({ shown: views, replaying: false, presentation: { ...get().presentation, headId: null } });
        if (!get().story.running) get().finishEpisode();
      }, REPLAY_TICK_MS);
    },
    finishEpisode: () => {
      const e = get().episode;
      if (!e || get().replaying || e.stage === 'exploring' || e.stage === 'finished') return;
      if (e.stage === 'reflecting') {
        if (!get().story.running) { stopEpisodeTimer(); set({ episode: { ...e, stage: 'finished' } }); }
        return;
      }
      stopEpisodeTimer();
      const top = holders(get().garden, e.day)[0]?.entityId ?? null;
      set({ episode: { ...e, stage: 'reflecting' }, focusedId: null, hoveredId: null,
        presentation: { ...NO_PRESENTATION, overview: true, line: episodeReflection(get().garden, e) } });
      if (get().story.running) return; // the film owns its absolute timeline
      const start = presentationClock.now(), generation = get().generation;
      episodeTimer = setInterval(() => {
        if (get().generation !== generation) { stopEpisodeTimer(); return; }
        const age = presentationClock.now() - start;
        set({ presentation: { ...get().presentation, holderId: age >= 4000 ? top : null,
          line: age >= 9000 ? CLOSING_LINES[1] : age >= 4000 ? CLOSING_LINES[0] : episodeReflection(get().garden, e) } });
        if (age >= 14000) {
          stopEpisodeTimer();
          set({ episode: { ...get().episode!, stage: 'finished' } });
        }
      }, REPLAY_TICK_MS);
    },
    continueEpisode: () => {
      const e = get().episode;
      if (!e || e.stage !== 'finished' || e.continued) return;
      const garden = structuredClone(get().garden);
      garden.light = Math.min(C.LIGHT_MAX, garden.light + C.LIGHT_PER_REAL_DAY);
      set({ ...withViews(garden, e.day), episode: { ...e, continued: true }, presentation: { ...NO_PRESENTATION },
        focusedId: null, reveal: { open: false, entityId: null }, whisperOverride: null, returnSummary: null });
    },
    restartEpisode: () => get().beginEpisode('play'),
    setPresentation: (patch) => set({ presentation: { ...get().presentation, ...patch } }),
    stopPresentation: () => {
      const e = get().episode;
      if (e?.stage === 'reflecting') stopEpisodeTimer();
      set({ presentation: { ...NO_PRESENTATION }, story: { running: false, line: null, title: null },
        episode: e ? { ...e, mode: 'play', stage: e.stage === 'reflecting' ? 'finished' : e.stage } : null });
      if (e?.stage === 'passing' && !get().replaying) get().finishEpisode();
    },
    garden: initial,
    clock: { debugOffset: urlDays },
    views: initialViews,
    shown: initialViews,
    replaying: false,
    positions: startingEpisode?.positions ?? stress?.positions ?? {},
    photos: {},
    hoveredId: null,
    focusedId: null,
    returnSummary: null,
    tagSources: {},
    events: [],
    planting: 'closed',
    phase: startPhase,
    owner: 'demo',
    promptIndex: 0,
    whisperOverride: null,
    reveal: { open: false, entityId: null },
    settings: false,
    story: { running: false, line: null, title: null },
    draft: null,

    now: () => {
      const { garden, clock, episode } = get();
      if (episode) return episode.day;
      return gardenNow(garden.lastSeenAt, garden.lastSeenReal, realNow(), clock.debugOffset);
    },
    refresh: () => { if (get().episode?.stage === 'passing') return; stopReplay(); const views = viewAll(get().garden, get().now()); set({ views, shown: views, replaying: false }); },

    // Hidden time slider: scrubbing only previews. `arrive()` commits the elapsed time like a real return visit.
    setDebugOffset: (d) => { if (get().episode) return; set({ clock: { debugOffset: d } }); get().refresh(); },

    hover: (id) => set({ hoveredId: id }),
    focus: (id) => set({ focusedId: id }),

    tendMemory: (id) => {
      if (!episodeEditable() || !canTend(get().garden, id)) return;
      commitPreview();
      let rippled: string[] = [];
      mutate((g, now) => { rippled = tend(g, id, now); });
      emit('tend', [id]); emit('ripple', rippled);
      remember('tended', id);
    },
    letGoMemory: (id) => {
      if (!episodeEditable() || !get().garden.memories[id] || get().garden.memories[id].lost) return;
      commitPreview(); mutate((g, now) => letGo(g, id, now)); emit('dissolve', [id]); remember('letGo', id);
    },
    returnToMemory: (id) => {
      if (!episodeEditable() || !canReturn(get().garden, id)) return;
      commitPreview(); mutate((g, now) => returnTo(g, id, now)); emit('bloom', [id]); remember('returned', id);
    },

    plantMemory: async (kind, text, extra = {}) => {
      if (!text.trim() || !get().canPlantNow()) return null;
      const generation = get().generation;
      set({ plantingPending: true });
      try {
      commitPreview();
      const { garden } = get();
      // Plant at once: with the draft's tags if it has them, otherwise the offline tagger (in the browser, no network).
      const dropped = extra.dropped ?? [];
      const tags = extra.tags ?? dropTags(await offlineTag(garden, kind, text), dropped);
      if (get().generation !== generation || !episodeEditable()) return null;
      const source = extra.tags ? extra.tagSource ?? 'offline' : 'offline';
      const id = extra.choice && get().episode && !get().garden.memories[EPISODE_CHOICES[extra.choice].id] ? EPISODE_CHOICES[extra.choice].id : newId();
      const place = extra.place ?? nextPlace();
      set((s) => ({ positions: { ...s.positions, [id]: place } }));
      mutate((g, now) => {
        plant(g, { id, kind, text, hue: extra.hue, photoId: extra.photoId, ...tags }, now, realNow());
      });
      set((s) => ({ tagSources: { ...s.tagSources, [id]: source } }));
      emit('bloom', [id]);
      const e = get().episode;
      if (e) set({ episode: { ...e, plantingUsed: true, extraPlants: e.extraPlants + (e.continued ? 1 : 0), planted: [...e.planted, id] } });
      // Planted alone: once it has grown, the garden says how memories hold each other (not in the first plantings,
      // where the season and its return speak next).
      if (get().phase === 'garden' && !get().garden.threads.some((t) => t.a === id || t.b === id)) say(ALONE_WHISPER, ALONE_AFTER_MS);
      // Offline tags only: ask the provider in the background; if it answers in time, its tags replace them.
      if (source === 'offline' && !get().episode) {
        void apiTag(get().garden, kind, text).then((better) => {
          if (!better || get().generation !== generation || !get().garden.memories[id]) return;
          mutate((g) => retag(g, id, dropTags(better, dropped)));
          set((s) => ({ tagSources: { ...s.tagSources, [id]: better.source } }));
        });
      }
      return id;
      } finally { if (get().generation === generation) set({ plantingPending: false }); }
    },

    // Return visit: apply the time away, then replay it. The garden first shows how it was, and each memory eases
    // to how it is now, one after another (most changed first), while the fog rises. Lost ones dissolve once they have
    // become ghosts; ghosts about to be lost glow once, so they can still be saved.
    arrive: () => {
      if (get().episode) return;
      hush();
      const before = viewAll(get().garden, get().garden.lastSeenAt);
      const g = structuredClone(get().garden);
      const now = get().now();
      const summary = visit(g, now, realNow());
      const next = withViews(g, now);
      const changed = [...summary.lost, ...summary.faded, ...Object.keys(next.views)
        .filter((id) => !summary.lost.includes(id) && !summary.faded.includes(id) && before[id] && before[id].vitality - next.views[id].vitality > 0.02)];
      const start = performance.now() + 400;
      const delay = (id: string) => start + Math.max(0, changed.indexOf(id)) * REPLAY_STAGGER_MS;
      const shown: Record<string, MemoryView> = { ...next.views };
      for (const id of changed) if (before[id]) shown[id] = before[id];
      set({ ...next, shown, replaying: changed.length > 0, returnSummary: summary, clock: { debugOffset: 0 } });
      emit('dissolve', summary.lost, (id) => delay(id) + DISSOLVE_AFTER_MS);
      emit('beckon', summary.aboutToBeLost, (id) => delay(id) + BECKON_AFTER_MS);
      if (!changed.length) return;
      replayTimer = setInterval(() => {
        const t = performance.now();
        const { views, shown: cur } = get();
        const due = changed.filter((id) => cur[id] !== views[id] && t >= delay(id));
        if (due.length) set({ shown: { ...cur, ...Object.fromEntries(due.map((id) => [id, views[id]])) } });
        if (changed.every((id) => get().shown[id] === views[id])) { stopReplay(); set({ replaying: false }); }
      }, REPLAY_TICK_MS);
    },

    resetDemo: () => {
      cancelSession();
      const g = sampleGarden(100, realNow());
      const views = viewAll(g, 100);
      set({
        garden: g, views, shown: views, replaying: false, positions: {}, events: [], tagSources: {},
        clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null, planting: 'closed', draft: null,
        whisperOverride: null, reveal: { open: false, entityId: null }, owner: 'demo', settings: false,
      });
      growIn(GROW_IN_AFTER_MS);
    },

    /* ---------- the threshold and the first plantings (P8) ---------- */

    seeDemo: () => { get().resetDemo(); get().openDemo(); },
    prepareDemo: (afterMs) => { get().resetDemo(); growIn(afterMs + GROW_IN_AFTER_MS); },
    openDemo: () => { set({ phase: 'garden' }); say(RULE_WHISPER); },

    // Coming back: the garden as it was left, then the time away, played as the return replay (P7.1).
    enterOwn: async () => {
      cancelSession();
      const generation = get().generation;
      const found = await kept;
      if (get().generation !== generation) return;
      if (!found) { get().beginOwn(); return; }
      const { stored, photos } = found;
      markKept(Object.keys(photos));
      const views = viewAll(stored.garden, stored.garden.lastSeenAt);
      set({
        garden: stored.garden, views, shown: views, replaying: false, positions: stored.layout,
        photos: Object.fromEntries(Object.entries(photos).map(([id, blob]) => [id, { blob, url: URL.createObjectURL(blob) }])),
        events: [], tagSources: {}, clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null,
        planting: 'closed', draft: null, whisperOverride: null, reveal: { open: false, entityId: null }, settings: false,
        owner: 'own', promptIndex: stored.promptIndex,
        phase: stored.promptIndex < FIRST_PROMPTS.length ? 'first' : 'garden',
      });
      get().arrive();
    },

    beginOwn: () => {
      cancelSession();
      const g = emptyGarden(realNow());
      const views = viewAll(g, 0);
      set({
        garden: g, views, shown: views, replaying: false, positions: {}, photos: {}, events: [], tagSources: {},
        clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null, planting: 'closed', draft: null,
        phase: 'first', promptIndex: 0, whisperOverride: null, reveal: { open: false, entityId: null }, owner: 'own', settings: false,
      });
    },

    plantPrompt: async (text, photo) => {
      const i = get().promptIndex;
      const prompt = FIRST_PROMPTS[i];
      if (!prompt || !text.trim()) return;
      let extra: { photoId?: string; hue?: string } = {};
      if (photo) {
        const photoId = newId('p');
        set((s) => ({ photos: { ...s.photos, [photoId]: { blob: photo, url: URL.createObjectURL(photo) } } }));
        extra = { photoId, hue: await dominantColor(photo) };
      }
      // Move on at once: the flower grows below while the next prompt appears.
      advancePrompt();
      await get().plantMemory(prompt.kind, text.trim(), { ...extra, place: FIRST_PLANTING_PLACES[i] });
    },
    skipPrompt: () => advancePrompt(),

    /* ---------- the reveal: what holds your garden (P9) ---------- */

    openReveal: () => {
      const top = holders(get().garden, get().now())[0];
      draftRequest?.abort();
      set({ reveal: { open: true, entityId: top?.entityId ?? null }, focusedId: null, hoveredId: null, planting: 'closed', draft: null, settings: false });
    },
    selectHolder: (entityId) => set({ reveal: { open: true, entityId } }),
    closeReveal: () => set({ reveal: { open: false, entityId: null } }),

    /* ---------- settings (P10.2, screen p13) ---------- */

    // One overlay at a time: settings closes whatever else is open.
    openSettings: () => {
      draftRequest?.abort();
      set({ settings: true, focusedId: null, hoveredId: null, planting: 'closed', draft: null, reveal: { open: false, entityId: null } });
    },
    closeSettings: () => set({ settings: false }),
    // When the story ends, its return line is old news: the garden's usual whisper takes over.
    setStory: (patch) => set((s) => ({
      story: { ...s.story, ...patch },
      ...(patch.running === false && s.story.running ? { returnSummary: null } : {}),
    })),
    letGardenGo: async () => {
      cancelSession();
      if (keepTimer) clearTimeout(keepTimer);
      keepTimer = null;
      draftRequest?.abort();
      kept = Promise.resolve(null);
      await forget();
      for (const p of Object.values(get().photos)) URL.revokeObjectURL(p.url);
      const g = emptyGarden(realNow());
      const views = viewAll(g, 0);
      set({
        garden: g, views, shown: views, replaying: false, positions: {}, photos: {}, events: [], tagSources: {},
        clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null, planting: 'closed', draft: null,
        phase: 'threshold', owner: 'demo', promptIndex: 0, whisperOverride: null, reveal: { open: false, entityId: null },
        settings: false,
      });
    },

    /* ---------- planting (screens p4–p6) ---------- */

    canPlantNow: () => {
      if (get().plantingPending || !episodeEditable()) return false;
      const e = get().episode;
      return e ? e.continued ? e.extraPlants < 3 : !e.plantingUsed : canPlant(get().garden, realNow());
    },

    openPlanting: (step = 'kind', kind = 'sentence') => {
      if (!get().canPlantNow()) return;
      const draft = get().draft;
      set({
        planting: get().episode && step === 'kind' ? 'choices' : step, focusedId: null, settings: false, reveal: { open: false, entityId: null },
        draft: draft ?? { kind, text: '', tags: null, source: null, dropped: [], place: nextPlace() },
      });
    },
    closePlanting: () => { draftRequest?.abort(); set({ planting: 'closed', draft: null }); },
    setDraftKind: (kind) => { set({ planting: 'field' }); setDraft({ kind, choice: undefined, tags: null, source: null }); },
    setDraftText: (text) => setDraft({ text, choice: undefined }),
    setDraftPhoto: async (file) => {
      const photoId = newId('p');
      const url = URL.createObjectURL(file);
      set((s) => ({ photos: { ...s.photos, [photoId]: { blob: file, url } } }));
      setDraft({ photoId, hue: undefined });
      const hue = await dominantColor(file);
      if (get().draft?.photoId === photoId) setDraft({ hue });
    },
    dropDraftTag: (name) => {
      const d = get().draft;
      if (!d?.tags) return;
      const dropped = [...d.dropped, name.toLowerCase()];
      setDraft({ dropped, tags: dropTags(d.tags, dropped) });
    },
    tagDraft: async () => {
      const d = get().draft;
      if (!d || d.choice) return;
      const generation = get().generation;
      const { kind, text } = d;
      draftRequest?.abort();
      if (!text.trim()) { setDraft({ tags: null, source: null }); return; }
      const still = () => get().generation === generation && get().draft?.text === text && get().draft?.kind === kind;
      const offline = await offlineTag(get().garden, kind, text);
      if (!still()) return;
      setDraft({ tags: dropTags(offline, get().draft!.dropped), source: 'offline' });
      if (get().episode) return;
      const request = (draftRequest = new AbortController());
      const better = await apiTag(get().garden, kind, text, request.signal).catch(() => null);
      if (!better || request.signal.aborted || !still()) return;
      setDraft({ tags: dropTags(better, get().draft!.dropped), source: better.source });
    },
    plantDraft: async () => {
      const d = get().draft;
      if (!d || !d.text.trim()) return null;
      draftRequest?.abort();
      set({ planting: 'closed', draft: null });
      return get().plantMemory(d.kind, d.text.trim(), {
        choice: d.choice, hue: d.hue, photoId: d.photoId, place: d.place, dropped: d.dropped,
        ...(d.tags ? { tags: d.tags, tagSource: d.source ?? 'offline' } : {}),
      });
    },
  };
});

/**
 * Keep your own garden: write it 500ms after the last change to it, where its flowers stand, or the first plantings,
 * and once more when the page is hidden or closed. The demo garden is never written.
 */
const KEEP_AFTER_MS = 500;
let keepTimer: ReturnType<typeof setTimeout> | null = null;
const keepNow = () => {
  if (keepTimer) clearTimeout(keepTimer);
  keepTimer = null;
  const { owner, garden, positions, promptIndex, photos } = useGarden.getState();
  if (owner === 'own') void keep({ garden, layout: positions, promptIndex }, photos, realNow());
};
useGarden.subscribe((s, prev) => {
  if (s.owner !== 'own') return;
  if (s.garden === prev.garden && s.positions === prev.positions && s.promptIndex === prev.promptIndex && s.owner === prev.owner) return;
  if (keepTimer) clearTimeout(keepTimer);
  keepTimer = setTimeout(keepNow, KEEP_AFTER_MS);
});
if (typeof addEventListener !== 'undefined') {
  addEventListener('pagehide', () => { if (keepTimer) keepNow(); });
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && keepTimer) keepNow(); });
}

/** The living memories a person or place holds (the reveal lights these). */
export function heldBy(g: Garden, entityId: string | null): string[] {
  if (!entityId) return [];
  return Object.values(g.memories)
    .filter((m) => !m.lost && (m.people.includes(entityId) || m.places.includes(entityId)))
    .map((m) => m.id);
}

/**
 * In the episode, what tending the open memory would reach: its living neighbours, exactly the memories `tend()`
 * spills light into. Null when tending is not possible (no light, a lost memory, outside the episode's choices).
 */
export function useTendReach(): string[] | null {
  const focusedId = useGarden((s) => s.focusedId);
  const garden = useGarden((s) => s.garden);
  const episode = useGarden((s) => s.episode);
  if (!focusedId || !episode) return null;
  const editable = episode.stage === 'exploring' || (episode.stage === 'finished' && episode.continued);
  const m = garden.memories[focusedId];
  if (!editable || !m || m.lost || garden.light < C.TEND_COST) return null;
  return neighbours(garden, focusedId).map((n) => n.other).filter((id) => garden.memories[id] && !garden.memories[id].lost);
}

/** What the reveal lights right now: the chosen holder's memories, or null when the reveal is closed. */
export function useRevealHeld(): string[] | null {
  const reveal = useGarden((s) => s.reveal);
  const presentedHolder = useGarden((s) => s.presentation.holderId);
  const garden = useGarden((s) => s.garden);
  return reveal.open ? heldBy(garden, reveal.entityId) : presentedHolder ? heldBy(garden, presentedHolder) : null;
}
