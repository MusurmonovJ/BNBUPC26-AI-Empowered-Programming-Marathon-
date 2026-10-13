// The 3D scene tells the rest of the app when its shaders have been compiled (ShaderWarmup), so the garden's first
// moment, growing in, never stutters. Until then nothing in the scene hides its empty parts, so every shader is
// drawn once, in the real render pipeline. Plain values: no React, no Three.

/** Until this time (performance.now), parts that would draw nothing are drawn anyway. */
export const warmup = { until: (typeof performance !== 'undefined' ? performance.now() : 0) + 2500 };
export const warming = () => performance.now() < warmup.until;

let resolveReady: () => void = () => {};
/** Resolves once every shader in the garden has been drawn once. */
export const sceneReady = new Promise<void>((resolve) => { resolveReady = resolve; });
export const markSceneReady = () => resolveReady();
