// The garden: stage (P2), flowers (P3), threads (P4). See docs/build-plan.md.

import { Canvas } from '@react-three/fiber';
import { TOKENS } from '../engine';
import { useGarden, useRevealHeld, useTendReach } from '../store/garden';
import { CameraRig, HOME_POS } from './camera/CameraRig';
import { Effects } from './Effects';
import { Flower } from './flower/Flower';
import { FogBanks } from './fog/FogBanks';
import { Ground } from './ground/Ground';
import { DraftSeed, EmptyGardenSeed } from './plant/DraftSeed';
import { Pollen } from './fx/Pollen';
import { ScreenProjector } from './ScreenProjector';
import { ShaderWarmup } from './ShaderWarmup';
import { RIPPLE_TRAVEL_MS } from './thread/ThreadArc';
import { baseToWorld } from './layout';
import { Threads } from './thread/Threads';
import { useLayout } from './useLayout';

/** How far the rest of the garden recedes while one memory is open. */
const FOCUS_DIM = 0.3;
/** In the reveal, what the chosen person or place does not hold recedes to 15% (scene-spec § The reveal). */
const REVEAL_DIM = 0.15;
/** The episode's closing composition lights a holder gently: the rest of the changed garden stays visible. */
const PRESENT_DIM = 0.45;
/** While a memory is open with light to spend, what tending it would reach stays almost fully lit. */
const REACH_DIM = 0.85;

export function GardenScene() {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      style={{ position: 'absolute', inset: 0 }}
      camera={{ position: HOME_POS.toArray(), fov: 40, near: 0.1, far: 80 }}
      // No MSAA here: the post-processing passes render without it (multisampling={0}), so it would be wasted.
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => useGarden.getState().focus(null)}
    >
      <color attach="background" args={[TOKENS.night]} />
      <fogExp2 attach="fog" args={[TOKENS.night, 0.045]} />
      <CameraRig />
      <ScreenProjector />
      <Ground />
      <Flowers />
      <Threads />
      <Pollen />
      <DraftSeed />
      <EmptyGardenSeed />
      <FogBanks />
      <Effects />
      <ShaderWarmup />
    </Canvas>
  );
}

function Flowers() {
  const garden = useGarden((s) => s.garden);
  const shown = useGarden((s) => s.shown);
  const layout = useLayout();
  const events = useGarden((s) => s.events);
  const focusedId = useGarden((s) => s.focusedId);
  const held = useRevealHeld();
  const revealOpen = useGarden((s) => s.reveal.open);
  const reach = useTendReach();
  const { hover, focus } = useGarden.getState();
  // A tended flower swells at once; its neighbours swell as the ripple reaches them along the thread.
  const swellAt = (id: string) => {
    const e = events.filter((x) => x.id === id && (x.type === 'tend' || x.type === 'ripple' || x.type === 'beckon')).at(-1);
    return e ? e.at + (e.type === 'ripple' ? RIPPLE_TRAVEL_MS : 0) : undefined;
  };
  const diedAt = (id: string) => events.filter((x) => x.id === id && x.type === 'dissolve').at(-1)?.at;
  const bornAt = (id: string) => events.filter((x) => x.id === id && x.type === 'bloom').at(-1)?.at;
  return (
    <>
      {Object.values(garden.memories).map((m) => {
        const L = layout[m.id];
        if (!L) return null;
        return (
          <Flower key={m.id} kind={m.kind} seed={m.id} hue={m.hue} size={L.size} state={shown[m.id].state}
            position={baseToWorld(L.x, L.y)} swellAt={swellAt(m.id)} bornAt={bornAt(m.id)} diedAt={diedAt(m.id)}
            // An open memory stands alone; the rest of the garden recedes, as in screen p2.
            dim={held ? (held.includes(m.id) ? 1 : revealOpen ? REVEAL_DIM : PRESENT_DIM)
              : focusedId && focusedId !== m.id ? (reach?.includes(m.id) ? REACH_DIM : FOCUS_DIM) : 1}
            onPointerOver={(e) => { e.stopPropagation(); hover(m.id); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { hover(null); document.body.style.cursor = ''; }}
            onClick={(e) => { e.stopPropagation(); if (!held) focus(m.id); }} />
        );
      })}
    </>
  );
}
