import { describe, expect, it } from 'vitest';
import { advance, C, plant, tend, viewAll } from '../engine';
import { SAMPLE } from './sample';
import { episodeGarden, EPISODE_CHOICES, EPISODE_DAY, EPISODE_DAYS, EPISODE_MEMORIES, LONG_KEPT } from './episode';

describe('the authored episode', () => {
  it('has 23 stable memories, all original words and associations, and a complete layout', () => {
    const { garden, positions } = episodeGarden(0);
    expect(Object.keys(garden.memories)).toHaveLength(23);
    expect(Object.keys(positions)).toHaveLength(23);
    expect(garden.light).toBe(1);
    for (const s of SAMPLE) {
      const m = garden.memories[s.id];
      expect(m.text).toBe(s.text);
      expect(m.people.map((id) => garden.entities[id].name)).toEqual(s.people?.map((x) => x.name) ?? []);
      expect(m.places.map((id) => garden.entities[id].name)).toEqual(s.places?.map((x) => x.name) ?? []);
      expect(m.feelings.map((id) => garden.entities[id].name)).toEqual(s.feelings?.map((x) => x.name) ?? []);
    }
    for (const m of EPISODE_MEMORIES) {
      const g = garden.memories[m.id];
      expect(g.text).toBe(m.text);
      expect(g.people.map((id) => garden.entities[id].name)).toEqual(m.people?.map((x) => x.name) ?? []);
      expect(g.places.map((id) => garden.entities[id].name)).toEqual(m.places?.map((x) => x.name) ?? []);
      expect(g.feelings).toEqual([]);
    }
    // Shared people make genuine threads: Grandma Mei's new memories join her sentence, Dad's join his.
    const threaded = (a: string, b: string) => garden.threads.some((t) => [t.a, t.b].includes(a) && [t.a, t.b].includes(b));
    expect(threaded('ep-e1', 'm1')).toBe(true);
    expect(threaded('ep-e10', 'm7')).toBe(true);
    expect(threaded('ep-e13', 'm1')).toBe(false);
    for (const m of Object.values(garden.memories)) {
      expect(m).not.toHaveProperty('vitality');
      expect(m.stability).toBeCloseTo(C.S_INITIAL * C.TEND_STABILITY_MULT ** (LONG_KEPT.includes(m.id) ? 3 : 0));
    }
    expect(viewAll(garden, EPISODE_DAY).m10.state).toBe('vivid');
    expect(episodeGarden(0)).toEqual(episodeGarden(0));
  });

  it.each([
    ['m1', 'tea', 'lost', 'fading'],
    ['m10', 'tea', 'ghost', 'ghost'],
    ['m1', 'rooftop', 'ghost', 'fading'],
    [null, null, 'lost', 'ghost'],
  ] as const)('real choices: tend %s, plant %s', (target, choice, rooftop, mei) => {
    const { garden } = episodeGarden(0);
    if (target) tend(garden, target, EPISODE_DAY);
    if (choice) plant(garden, EPISODE_CHOICES[choice], EPISODE_DAY, 0);
    expect(Object.keys(garden.memories)).toHaveLength(choice ? 24 : 23);
    const result = advance(garden, EPISODE_DAY, EPISODE_DAY + EPISODE_DAYS);
    const views = viewAll(garden, EPISODE_DAY + EPISODE_DAYS);
    expect(views.m10.state).toBe(rooftop);
    expect(views.m1.state).toBe(mei);
    for (const state of ['vivid', 'ghost', 'lost']) expect(Object.values(views).some((v) => v.state === state)).toBe(true);
    expect(result.gardenDaysPassed).toBe(21);
    if (choice === 'rooftop') {
      expect(garden.threads.some((t) => [t.a, t.b].includes('m10') && [t.a, t.b].includes('ep-choice-rooftop'))).toBe(true);
    }
  });
});
