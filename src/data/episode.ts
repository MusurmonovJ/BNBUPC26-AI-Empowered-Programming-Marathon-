// A fictional life, authored for the contest. It uses the real garden rules, never forced outcomes.
import { C, emptyGarden, plant, setVitality, type PlantInput } from '../engine';
import { SAMPLE } from './sample';
import type { Place } from './placement';

export const EPISODE_DAY = 100;
export const EPISODE_DAYS = 21;
export const EPISODE_INTRO = 'a fictional life · one season to discover what holds it';
export const EPISODE_CHOICE_LINE = 'one light remains. tending a memory also reaches what is connected.';
export const CLOSING_LINES = ['you cannot keep every moment in bloom.', 'what you tend gives the garden its shape.'] as const;
const tags = (...names: string[]) => names.map((name) => ({ name }));
export const EPISODE_MEMORIES: PlantInput[] = [
  { id: 'ep-e1', kind: 'sentence', text: '“Let it steep a little longer.” Grandma Mei taught me to make tea.', people: tags('Grandma Mei'), places: tags('Hangzhou') },
  { id: 'ep-e2', kind: 'photo', text: 'Grandma Mei’s hands folding dumplings in Hangzhou.', people: tags('Grandma Mei'), places: tags('Hangzhou'), hue: '#d9c7a8' },
  { id: 'ep-e3', kind: 'place', text: 'Grandma Mei’s balcony in Hangzhou after the rain.', people: tags('Grandma Mei'), places: tags('Hangzhou') },
  { id: 'ep-e4', kind: 'song', text: 'The tune Grandma Mei hummed while washing cups.', people: tags('Grandma Mei'), places: tags('Hangzhou') },
  { id: 'ep-e5', kind: 'photo', text: 'Leo asleep against the night-bus window.', people: tags('Leo'), hue: '#e8a87c' },
  { id: 'ep-e6', kind: 'sentence', text: '“We missed the last train.” Leo laughed before we started walking.', people: tags('Leo') },
  { id: 'ep-e7', kind: 'place', text: 'The station outside Kamakura, waiting with Leo.', people: tags('Leo'), places: tags('Kamakura') },
  { id: 'ep-e8', kind: 'place', text: 'Dad’s workbench, covered in pencil shavings.', people: tags('Dad'), places: tags('Dad’s workshop') },
  { id: 'ep-e9', kind: 'photo', text: 'Dad holding the bicycle while I tried again.', people: tags('Dad'), hue: '#d9c7a8' },
  { id: 'ep-e10', kind: 'sentence', text: '“Try once more.” Dad stayed beside me.', people: tags('Dad') },
  { id: 'ep-e11', kind: 'photo', text: 'Rain on a train window, somewhere I no longer remember.', hue: '#9faab8' },
  { id: 'ep-e12', kind: 'place', text: 'A roadside field seen once through a train window.', places: tags('roadside field') },
  { id: 'ep-e13', kind: 'song', text: 'A melody from a shop I never found again.' },
];
export const EPISODE_CHOICES = {
  tea: { id: 'ep-choice-tea', kind: 'sentence', text: 'Tea with Grandma Mei in Hangzhou.', people: tags('Grandma Mei'), places: tags('Hangzhou') },
  rooftop: { id: 'ep-choice-rooftop', kind: 'sentence', text: 'Leo and me on the library rooftop at university.', people: tags('Leo'), places: tags('university') },
} satisfies Record<string, PlantInput>;
export type EpisodeChoice = keyof typeof EPISODE_CHOICES;
export const LONG_KEPT = ['ep-e2', 'ep-e4', 'm4', 'ep-e7', 'm8', 'ep-e9'];
const p = (x: number, y: number, size: number): Place => ({ x, y, size });
export const EPISODE_LAYOUT: Record<string, Place> = {
  m1: p(430, 520, 150), m2: p(280, 640, 135), m3: p(600, 740, 105),
  'ep-e1': p(150, 780, 95), 'ep-e2': p(590, 500, 100), 'ep-e3': p(400, 830, 110), 'ep-e4': p(690, 660, 95),
  m4: p(930, 570, 140), m5: p(1170, 460, 140), m6: p(1040, 800, 130),
  'ep-e5': p(820, 700, 100), 'ep-e6': p(1280, 640, 105), 'ep-e7': p(1190, 850, 100),
  m7: p(130, 370, 110), m8: p(330, 300, 105), 'ep-e8': p(500, 370, 105),
  'ep-e9': p(150, 560, 95), 'ep-e10': p(360, 430, 95),
  m9: p(1080, 310, 105), m10: p(1290, 760, 130),
  'ep-e11': p(720, 360, 95), 'ep-e12': p(790, 510, 95), 'ep-e13': p(1280, 290, 100),
};
export const EPISODE_PLACES = {
  tea: p(510, 820, 115), rooftop: p(1140, 720, 115), custom: p(700, 840, 110),
  extra: [p(720, 570, 95), p(650, 450, 95), p(860, 350, 95)],
};

export function episodeGarden(realNow: number) {
  const garden = emptyGarden(realNow);
  for (const m of [...SAMPLE, ...EPISODE_MEMORIES]) plant(garden, m, EPISODE_DAY, realNow);
  for (const id of LONG_KEPT) garden.memories[id].stability = C.S_INITIAL * C.TEND_STABILITY_MULT ** 3;
  for (const m of SAMPLE) setVitality(garden, m.id, m.id === 'm10' ? 0.9 : LONG_KEPT.includes(m.id) ? 0.95 : m.vitality, EPISODE_DAY);
  for (const m of EPISODE_MEMORIES) setVitality(garden, m.id,
    m.id === 'ep-e12' ? 0.4 : m.id === 'ep-e13' ? 0.18 : LONG_KEPT.includes(m.id) ? 0.95 : 0.9, EPISODE_DAY);
  garden.light = 1;
  garden.plantsToday = 0;
  garden.firstPlantingsDone = true;
  garden.lastSeenAt = EPISODE_DAY;
  return { garden, positions: { ...EPISODE_LAYOUT } };
}
