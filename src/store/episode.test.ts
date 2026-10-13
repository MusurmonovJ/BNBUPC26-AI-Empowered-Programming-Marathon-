// The contest episode's store contract (plan §6, "store and presentation"): one light and one planting, a paused
// clock, a single season, truthful reflections, cancellation across sessions, no personal persistence, and a film
// that can be stopped at any beat, pauses with the tab, plays a second season of the same life, and ends without
// resurrecting anything.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./persist', () => ({
  load: () => Promise.resolve(null),
  keep: vi.fn(async () => {}),
  markKept: vi.fn(),
  forget: vi.fn(async () => {}),
  exportFile: vi.fn(),
}));

import { CLOSING_LINES, EPISODE_DAY, EPISODE_DAYS } from '../data/episode';
import { C } from '../engine';
import { keep } from './persist';
import { episodeReflection, useGarden } from './garden';
import { createPresentationClock, presentationClock } from './presentationClock';
import { FILM_SECONDS, FILM_TITLES, startStory, stopStory } from '../ui/story';

const s = () => useGarden.getState();
const count = (type: string, id?: string) => s().events.filter((e) => e.type === type && (!id || e.id === id) && !e.quiet).length;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
  vi.stubGlobal('addEventListener', () => {});
  vi.stubGlobal('removeEventListener', () => {});
  s().beginEpisode('play');
});
afterEach(() => {
  stopStory();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('playable episode: one light, one planting, one season', () => {
  it('opens the fictional life paused: 23 memories, one light, time standing still', async () => {
    expect(Object.keys(s().garden.memories)).toHaveLength(23);
    expect(s().garden.light).toBe(1);
    expect(s().episode?.stage).toBe('exploring');
    expect(s().owner).toBe('demo');
    const before = s().views;
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    s().refresh();
    expect(s().now()).toBe(EPISODE_DAY);
    expect(s().views.m1.vitality).toBeCloseTo(before.m1.vitality);
  });

  it('a double tend spends the light once, and an impossible tend gives no feedback', () => {
    s().tendMemory('m1');
    s().tendMemory('m1');
    expect(s().garden.light).toBe(0);
    expect(count('tend')).toBe(1);
    s().tendMemory('m4');
    expect(count('tend')).toBe(1);
    expect(s().episode?.tended).toEqual(['m1']);
  });

  it('returning a memory that is not lost does nothing and blooms nothing', () => {
    s().returnToMemory('m10');
    expect(count('bloom')).toBe(0);
    expect(s().garden.light).toBe(1);
  });

  it('allows one planting before the season, by fragment or by hand', async () => {
    expect(s().canPlantNow()).toBe(true);
    expect(await s().plantEpisodeChoice('tea')).toBe('ep-choice-tea');
    expect(Object.keys(s().garden.memories)).toHaveLength(24);
    expect(s().canPlantNow()).toBe(false);
    expect(await s().plantEpisodeChoice('rooftop')).toBeNull();
    expect(Object.keys(s().garden.memories)).toHaveLength(24);
  });

  it('the rooftop fragment really threads the rooftop to Leo', async () => {
    await s().plantEpisodeChoice('rooftop');
    const t = s().garden.threads.find((x) => [x.a, x.b].includes('m10') && [x.a, x.b].includes('ep-choice-rooftop'));
    expect(t).toBeDefined();
  });

  it('a season passes once, on the episode clock, and actions wait while it passes', () => {
    s().advanceEpisode();
    s().advanceEpisode();
    expect(s().episode?.day).toBe(EPISODE_DAY + EPISODE_DAYS);
    expect(s().episode?.stage).toBe('passing');
    s().tendMemory('m1');
    expect(s().garden.light).toBe(1);
    expect(count('tend')).toBe(0);
  });

  it('the replay starts every change within 1.2s, then the reflection opens and finishes', async () => {
    s().tendMemory('m1');
    s().advanceEpisode();
    const dissolves = s().events.filter((e) => e.type === 'dissolve');
    expect(dissolves.length).toBeGreaterThan(0);
    const spread = Math.max(...dissolves.map((e) => e.at)) - Math.min(...dissolves.map((e) => e.at));
    expect(spread).toBeLessThanOrEqual(1200);
    await vi.advanceTimersByTimeAsync(8500);
    expect(s().episode?.stage).toBe('reflecting');
    expect(s().presentation.overview).toBe(true);
    expect(s().presentation.line).toBe('you tended grandma mei’s words.');
    await vi.advanceTimersByTimeAsync(4500);
    expect(s().presentation.line).toBe(CLOSING_LINES[0]);
    await vi.advanceTimersByTimeAsync(10000);
    expect(s().episode?.stage).toBe('finished');
  });

  it('continue tending grants light once, keeps the clock paused, and allows three more plantings', async () => {
    s().advanceEpisode();
    await vi.advanceTimersByTimeAsync(25000);
    expect(s().episode?.stage).toBe('finished');
    const light = s().garden.light;
    s().continueEpisode();
    s().continueEpisode();
    expect(s().garden.light).toBe(Math.min(C.LIGHT_MAX, light + 3));
    expect(s().now()).toBe(EPISODE_DAY + EPISODE_DAYS);
    expect(s().presentation.line).toBeNull();
    for (let i = 0; i < 4; i++) await s().plantMemory('sentence', `A quiet afternoon ${i}.`, { tags: { people: [], places: [], feelings: [] } });
    expect(Object.keys(s().garden.memories)).toHaveLength(26);
  });

  it('restarting ends the old season: its timers and its planting cannot reach the new one', async () => {
    s().advanceEpisode();
    s().restartEpisode();
    await vi.advanceTimersByTimeAsync(30000);
    expect(s().episode?.stage).toBe('exploring');
    expect(s().now()).toBe(EPISODE_DAY);
    expect(Object.keys(s().garden.memories)).toHaveLength(23);
  });

  it('never writes the fictional life into the personal garden', async () => {
    s().tendMemory('m1');
    await s().plantEpisodeChoice('tea');
    s().advanceEpisode();
    await vi.advanceTimersByTimeAsync(30000);
    expect(keep).not.toHaveBeenCalled();
  });
});

describe('reflections only state what happened', () => {
  it('says nothing about actions that were not taken', () => {
    const e = s().episode!;
    expect(episodeReflection(s().garden, e)).toBe('the garden has changed. what remains still belongs to this life.');
  });
  it('names a tend, a connection and a return only when they exist', async () => {
    s().tendMemory('m1');
    expect(episodeReflection(s().garden, s().episode!)).toBe('you tended grandma mei’s words.');
    s().beginEpisode('play');
    await s().plantEpisodeChoice('rooftop');
    expect(episodeReflection(s().garden, s().episode!)).toBe('the rooftop found a thread to leo.');
    // A return is only claimed once it has really happened (here it cannot: the rooftop is not lost).
    s().returnToMemory('m10');
    expect(episodeReflection(s().garden, s().episode!)).not.toContain('returned');
  });
});

describe('a late answer cannot cross into a new session', () => {
  it('a planting still being tagged is dropped if the episode restarts', async () => {
    vi.useRealTimers();
    const p = s().plantMemory('sentence', 'My first bicycle, painted green.');
    s().restartEpisode();
    expect(await p).toBeNull();
    expect(Object.keys(s().garden.memories)).toHaveLength(23);
    expect(s().plantingPending).toBe(false);
  });
});

describe('the film', () => {
  // Beats across all seven acts (plus up to 4s while the scene warms): prologue, fragments, planting, the tend, the
  // first season, the rewind, the second season, the coda.
  const FILM_BEATS_S = [3, 10, 22, 30, 47, 55, 63, 74, 82, 95, 102, 110, 112, 118, 128, 136, 143, 152, 162, 170, 178];

  it('plays both seasons to the end on real actions, and resurrects nothing', async () => {
    startStory();
    await vi.advanceTimersByTimeAsync((FILM_SECONDS + 10) * 1000);
    expect(s().story.running).toBe(false);
    expect(s().episode?.stage).toBe('finished');
    // The second season: the rooftop planted with Leo, the light to Grandma Mei, and the rooftop still here.
    expect(s().episode?.tended).toEqual(['m1']);
    expect(s().episode?.planted).toEqual(['ep-choice-rooftop']);
    expect(s().garden.memories.m10.lost).toBeFalsy();
    expect(s().views.m10.state).toBe('ghost');
    expect(count('bloom', 'm10')).toBe(0);
    expect(s().presentation.line).toBe(CLOSING_LINES[1]);
  });

  it('the first season loses the rooftop; the film then regrows the same life and plays on', async () => {
    startStory();
    await vi.advanceTimersByTimeAsync((4 + 100) * 1000);
    expect(s().story.running).toBe(true);
    expect(s().episode?.planted).toEqual(['ep-choice-tea']);
    expect(s().garden.memories.m10.lost).toBe(true);
    await vi.advanceTimersByTimeAsync(8 * 1000);
    expect(s().story).toMatchObject({ running: true, title: FILM_TITLES.again });
    expect(s().episode).toMatchObject({ mode: 'film', stage: 'exploring', day: EPISODE_DAY, planted: [], tended: [] });
    expect(s().garden.memories.m10.lost).toBeFalsy();
    expect(Object.keys(s().garden.memories)).toHaveLength(23);
  });

  it('a restart from outside the film still ends it', async () => {
    startStory();
    await vi.advanceTimersByTimeAsync(30 * 1000);
    s().restartEpisode();
    expect(s().story.running).toBe(false);
    await vi.advanceTimersByTimeAsync(200 * 1000);
    expect(s().episode).toMatchObject({ mode: 'play', stage: 'exploring', planted: [], tended: [] });
  });

  it.each(FILM_BEATS_S)('can be stopped at %ss, leaving a live episode and no lingering emphasis', async (at) => {
    startStory();
    await vi.advanceTimersByTimeAsync(at * 1000);
    stopStory();
    expect(s().story).toMatchObject({ running: false, title: null });
    // The film's own emphasis goes at once. A season that has already passed carries on as the playable episode
    // does: its reflection may begin (with its overview), but nothing the film lit lingers.
    expect(s().presentation).toMatchObject({ holderId: null, headId: null, quiet: false });
    if (s().episode?.stage !== 'reflecting') expect(s().presentation.overview).toBe(false);
    expect(s().focusedId).toBeNull();
    expect(s().episode?.mode).toBe('play');
    const focused = s().focusedId, stage = s().episode?.stage;
    await vi.advanceTimersByTimeAsync(220_000);
    // No beat fires after stopping (a replay already under way still finishes on its own).
    expect(s().focusedId).toBe(focused);
    expect(s().story.running).toBe(false);
    if (stage === 'exploring') expect(s().episode?.stage).toBe('exploring');
  });

  it('pauses while the tab is hidden instead of skipping beats', async () => {
    startStory();
    await vi.advanceTimersByTimeAsync(4000 + 21_000);
    expect(s().focusedId).toBe('m1');
    presentationClock.hide();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(s().focusedId).toBe('m1');
    presentationClock.show();
    await vi.advanceTimersByTimeAsync(7000);
    expect(s().focusedId).toBe('m4');
  });
});

describe('presentation clock', () => {
  it('stands still while hidden and resumes without a jump', () => {
    let t = 0;
    const clock = createPresentationClock(() => t);
    t = 1000; expect(clock.now()).toBe(1000);
    clock.hide(); t = 5000; expect(clock.now()).toBe(1000);
    expect(clock.show()).toBe(4000);
    t = 5500; expect(clock.now()).toBe(1500);
  });
});
