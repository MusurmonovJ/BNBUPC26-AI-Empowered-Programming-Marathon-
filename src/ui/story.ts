// A three-minute film of real episode actions, in seven acts (D26): what Lethe is, how a life holds together, a
// planting, a choice, a season, the same life with a different choice, and what remains. Every outcome is the
// engine's own; nothing is forced lost and nothing is brought back.
import { CLOSING_LINES, EPISODE_CHOICES, EPISODE_INTRO } from '../data/episode';
import { holders } from '../engine';
import { useGarden } from '../store/garden';
import { presentationClock } from '../store/presentationClock';
import { sceneReady } from '../store/sceneReady';

/** Captions, in the interface voice: lowercase, read at the bottom of the screen. */
export const STORY_LINES = {
  flowers: 'every flower is a fragment of a life: words, songs, places, photographs.',
  rule: 'memories that share someone or somewhere hold each other up.',
  leo: 'a night bus with leo, held by every other memory of him.',
  rooftop: 'the library rooftop. a place remembered on its own.',
  alone: 'what nothing else shares has nothing to lean on.',
  plant: 'a new memory finds what it shares.',
  joins: 'it grows into what holds it.',
  tend: 'one light remains. to tend one memory is to choose it.',
  reach: 'its light reaches everything her words are part of.',
  rest: 'the rest is left to the season.',
  away: 'three weeks pass in this garden.',
  held: 'what was held together still glows.',
  shared: 'this time, the rooftop is remembered with leo.',
  thread: 'a thread reaches the rooftop.',
  again: 'the light still goes to grandma mei.',
  away2: 'three weeks pass again.',
  faint: 'the rooftop is still here, faint.',
  why: 'no light reached it. a thread did.',
  shape: CLOSING_LINES[0],
  holds: CLOSING_LINES[1],
} as const;

/** Title cards, in the sky above the garden at the film's turning points. */
export const FILM_TITLES = {
  kept: 'Everything we make today is made to be kept.',
  vault: 'But memory was never a vault.',
  garden: 'It is a garden.',
  erased: 'Nothing is erased. It only steps out of the light.',
  again: 'The same life. A different choice.',
  name: 'Lethe — a garden that forgets.',
} as const;

/** The film's length in seconds, from the first title card. */
export const FILM_SECONDS = 180;

let run: AbortController | null = null;
export const storyRunning = () => run !== null;

export function waitForPresentation(ms: number, signal: AbortSignal): Promise<void> {
  const until = presentationClock.now() + ms;
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const clean = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
    const abort = () => { clean(); reject(signal.reason); };
    const poll = () => {
      if (signal.aborted) { abort(); return; }
      if (presentationClock.now() >= until) { clean(); resolve(); return; }
      timer = setTimeout(poll, 50);
    };
    signal.addEventListener('abort', abort, { once: true });
    poll();
  });
}

/**
 * Entry is always a user gesture. From the threshold the episode is already prepared (it grows in as the threshold
 * fades), so it is only opened; anywhere else the film begins a fresh episode.
 */
export function startStory({ prepared = false }: { prepared?: boolean } = {}) {
  stopStory();
  const ctrl = (run = new AbortController());
  const s = useGarden.getState;
  if (prepared && s().episode?.mode === 'film') s().openEpisode(); else s().beginEpisode('film');
  let generation = s().generation;
  s().setStory({ running: true, line: EPISODE_INTRO, title: null });
  const signal = ctrl.signal;
  const line = (text: string | null) => s().setStory({ line: text });
  const title = (text: string | null) => s().setStory({ title: text });
  const interrupt = (event: Event) => {
    if (event.type === 'pointerdown' && event.target instanceof Element && event.target.closest('.story-entry')) return;
    stopStory();
  };
  addEventListener('pointerdown', interrupt, true);
  addEventListener('keydown', interrupt, true);
  addEventListener('wheel', interrupt, { capture: true, passive: true });
  // A new session (a restart, a reset, the person leaving) ends the film; only its own second season does not.
  let rewinding = false;
  const unsubscribe = useGarden.subscribe((state) => {
    if (!rewinding && (state.generation !== generation || !state.story.running)) ctrl.abort();
  });
  /** The same life again: the garden regrows from its seeds and the film plays on into a second season. */
  const rewind = () => {
    const story = s().story;
    rewinding = true;
    try { s().beginEpisode('film'); s().setStory(story); } finally { rewinding = false; }
    generation = s().generation;
  };
  signal.addEventListener('abort', () => {
    removeEventListener('pointerdown', interrupt, true);
    removeEventListener('keydown', interrupt, true);
    removeEventListener('wheel', interrupt, true);
    unsubscribe();
    if (run === ctrl) run = null;
  }, { once: true });

  const play = async () => {
    await Promise.race([sceneReady, waitForPresentation(4000, signal)]);
    if (signal.aborted) return;
    const started = presentationClock.now();
    const at = (seconds: number) => waitForPresentation(Math.max(0, started + seconds * 1000 - presentationClock.now()), signal);
    // Prologue: the seeds fall while three cards say what Lethe is.
    line(null); title(FILM_TITLES.kept);
    await at(4.5); title(FILM_TITLES.vault);
    await at(9); title(FILM_TITLES.garden);
    // Fragments: a life, and the rule that holds it together.
    await at(14); title(null); line(STORY_LINES.flowers);
    await at(20); s().focus('m1'); line(STORY_LINES.rule);
    await at(27); s().focus('m4'); line(STORY_LINES.leo);
    await at(33); s().focus('m10'); line(STORY_LINES.rooftop);
    await at(39); s().focus(null); line(STORY_LINES.alone);
    // Growing: one fragment is planted and joins her.
    await at(44); s().selectEpisodeChoice('tea'); line(STORY_LINES.plant);
    await at(51); await s().plantDraft(); line(STORY_LINES.joins);
    // Choosing: the last light.
    await at(58); s().focus('m1'); line(STORY_LINES.tend);
    await at(61); s().tendMemory('m1');
    await at(66); line(STORY_LINES.reach);
    await at(71); s().focus(null); line(STORY_LINES.rest);
    // A season: the rooftop dissolves up close, then the changed garden.
    await at(76); line(STORY_LINES.away);
    await at(79); s().focus('m10'); s().advanceEpisode(); line(null);
    await at(86); s().setPresentation({ headId: null, quiet: true });
    await at(91); s().focus(null); s().finishEpisode(); s().setPresentation({ quiet: false });
    await at(92); title(FILM_TITLES.erased);
    await at(99); title(null); s().setPresentation({ holderId: strongestHolder() }); line(STORY_LINES.held);
    await at(105); line(null);
    // Another choice: the same life regrows, and the rooftop is planted with Leo instead of the tea.
    await at(107); rewind(); title(FILM_TITLES.again);
    await at(114); title(null); s().selectEpisodeChoice('rooftop'); line(STORY_LINES.shared);
    await at(121); await s().plantDraft(); line(STORY_LINES.thread);
    await at(123.5); s().focus(EPISODE_CHOICES.rooftop.id);
    await at(127); s().focus('m1'); line(STORY_LINES.again);
    await at(130); s().tendMemory('m1');
    await at(134); s().focus(null); line(STORY_LINES.away2);
    await at(137); s().focus('m10'); s().advanceEpisode(); line(null);
    await at(145); line(STORY_LINES.faint);
    await at(151); line(STORY_LINES.why);
    await at(157); s().focus(null); s().finishEpisode(); line(null);
    // Coda: what remains, and the name.
    await at(159); s().setPresentation({ holderId: strongestHolder() }); line(STORY_LINES.shape);
    await at(165); line(STORY_LINES.holds);
    await at(171); title(FILM_TITLES.name);
    await at(FILM_SECONDS);
    if (s().generation !== generation || signal.aborted) return;
    s().setStory({ running: false, line: null, title: null });
    s().setPresentation({ line: CLOSING_LINES[1], quiet: false });
    s().finishEpisode();
    ctrl.abort();
  };
  void play().catch(() => { /* cancellation hands back the live episode */ });
}

/** The person or place that holds the most of what remains: the group the closing composition lights. */
function strongestHolder(): string | null {
  const s = useGarden.getState();
  return holders(s.garden, s.now())[0]?.entityId ?? null;
}

export function stopStory() {
  const ctrl = run;
  if (!ctrl) return;
  run = null;
  ctrl.abort();
  const s = useGarden.getState();
  s.stopPresentation();
  s.closePlanting();
  s.hover(null);
  s.focus(null);
}
