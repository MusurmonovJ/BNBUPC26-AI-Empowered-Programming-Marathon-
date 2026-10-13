import { describe, expect, it } from 'vitest';
import { emptyGarden } from './garden';
import { placeKey, placeOf } from './relations';
import { findEntity, resolveEntity } from './threads';

// Home-name edge and regression tests (Spark). Claude's behaviour (C6): every
// name for home threads as one place, whichever tagger named it; lookalikes
// ("the beach house") stay out.

const REAL = 1_700_000_000_000;

describe('placeKey: one home, whatever it is called', () => {
  it.each([
    ['homeplace', 'our homeplace'],
    ['home place', 'home place'],
    ['family home', 'our family home'],
    ['childhood home', 'childhood home'],
    ['homestead', 'the homestead'],
    ['house', 'my house'],
    ['flat', 'our flat'],
    ['apartment', 'my apartment'],
  ])('%s (%s) → home', (normalised, raw) => {
    expect(placeKey(normalised, raw)).toBe('home');
    expect(placeOf(normalised, raw)?.display).toBe('home');
  });

  it('only mine or ours: their house is not home', () => {
    expect(placeKey('their house', 'their house')).toBe('their house');
  });

  it('the beach house stays out', () => {
    expect(placeKey('beach house', 'the beach house')).toBe('beach house');
    expect(placeOf('beach house', 'the beach house')).toBeUndefined();
  });
});

describe('engine matching: home memories thread together', () => {
  it('resolving our homeplace then finding my house returns the same entity', () => {
    const g = emptyGarden(REAL);
    const id = resolveEntity(g, 'place', 'our homeplace');
    expect(g.entities[id].name).toBe('home');
    expect(findEntity(g, 'place', 'my house')?.id).toBe(id);
    expect(findEntity(g, 'place', 'back home')).toBeUndefined();
  });
});
