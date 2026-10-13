// Compiles every shader before the garden needs it. On Windows (Direct3D) a first compile stalls the page for up to
// a second, and the first bloom is the garden growing in: the moment that must not stutter. Three.js compiles a
// shader the first time it draws it, in the pipeline it draws it in, so the only reliable warm-up is drawing
// everything once: for its first second nothing in the scene hides its empty parts (`warming()`), and the bloom's,
// the dissolve's and a suggested thread's parts stand out of sight under the ground. Then the scene says it is ready.

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { markSceneReady, warmup } from '../store/sceneReady';
import { BloomGrowth } from './fx/BloomGrowth';
import { DarkSeed } from './fx/DarkSeed';
import { ThreadArc } from './thread/ThreadArc';

/** How long every part is drawn after the canvas appears; then a few more frames to be sure. */
const WARM_MS = 1200;
const AFTER_FRAMES = 3;
/** In front of the home camera but under the ground plane and deep in fog: drawn, never seen. */
const HIDDEN_AT: [number, number, number] = [0, -1.5, -24];
const A = new THREE.Vector3(-0.5, 0.2, 0), B = new THREE.Vector3(0.5, 0.2, 0);

export function ShaderWarmup() {
  const [done, setDone] = useState(false);
  const after = useRef(0);
  useEffect(() => { warmup.until = performance.now() + WARM_MS; }, []);
  useFrame(() => {
    if (done || performance.now() < warmup.until) return;
    if (++after.current < AFTER_FRAMES) return;
    setDone(true);
    markSceneReady();
  });
  if (done) return null;
  return (
    <group position={HIDDEN_AT}>
      <BloomGrowth bornAt={0} age={900} seed="warmup" />
      <DarkSeed age={4400} />
      <ThreadArc a={A} b={B} strength={0.6} suggested seed="warmup" />
    </group>
  );
}
