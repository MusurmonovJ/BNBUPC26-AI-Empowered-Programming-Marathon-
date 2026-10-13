import { describe, expect, it } from 'vitest';
import { markSceneReady, sceneReady, warming, warmup } from './sceneReady';

// Warm-up gate edge tests (Spark). Claude's behaviour (C7): the scene draws
// every part once, then signals ready so the ?demo grow-in never stutters.

describe('sceneReady warm-up gate', () => {
  it('starts warming with a deadline in the future', () => {
    expect(warming()).toBe(true);
    expect(warmup.until).toBeGreaterThan(performance.now());
  });

  it('resolves once marked ready', async () => {
    let done = false;
    void sceneReady.then(() => { done = true; });
    markSceneReady();
    await sceneReady;
    expect(done).toBe(true);
  });
});
