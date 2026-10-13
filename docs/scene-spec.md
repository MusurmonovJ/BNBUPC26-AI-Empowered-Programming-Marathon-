# Scene spec: the 3D garden

How each design-system rule becomes a Three.js parameter. The look reference is the screens PDF (pages 1, 3, 11, 15, 16) and the design system's Bloom and Thread pages. When a number here disagrees with what looks right, tune it in a sandbox, save a screenshot to `docs/look-log/`, then update this file.

## World

| thing | value |
|---|---|
| units | 1 world unit = 100 design px. Ground is the plane y = 0. |
| layout | design canvas (x, y) → z = (y−560)/100 × 1.6, x = (x−720)/100 × (11.5 − z)/11.5 (`src/scene/layout.ts`). The x spread cancels perspective, so from the default camera the garden keeps the design canvas's composition. |
| flower height | 1.5 × size / 100 (a 160px sentence flower is 2.4 units tall) |
| camera | perspective, fov 40, default position (0, 3.4, 11.5), looking at (0, 1.1, 0) |
| drift | x ± 0.8 over 40s, y ± 0.15 over 55s, around wherever the person left the camera. It starts after 5s without a touch and fades in over 2s. Never fast. |
| focus | look at head + (1.0, 0, 0) from there + (0, 0.35, 4.4), gliding with damping k = 1.2/s. The flower stands at about a third of the width, its words on the right half (left 54%). Other flowers recede to opacity 0.3 over ~1s and every thread dims to ×0.35 (screen p2). |
| overview | scrolling out lowers the polar ceiling from 83° (at distance 11.5) to 50° (at 24), so the camera rises over the garden as it pulls back. The reveal (P9) can glide to that pose. |
| limits | orbit azimuth ±70°, polar 30–83° (45° in the reveal), distance 3–24 (drei `OrbitControls`, damping on, pan on, zoom toward cursor). The look-at point stays clamped over the garden (x −9…9, z −7…6.5). <kbd>WASD</kbd>/arrows glide, <kbd>Q</kbd>/<kbd>E</kbd> turn (D23). |
| background | `night` #0b0e14; ground #0d1119 with a soft radial lighten under clusters |
| scene fog | `FogExp2(night, 0.045)` for depth; volumetric look comes from the fog banks below |

## Flowers (Bloom in 3D)

**Approach.** Port the design-system generator (`lethe-design-system/components/bundle.js`, `Bloom`) to `src/scene/flower/generator.ts` so it returns *data*, not SVG: stems as point lists, petals as outline paths, the head position, and anchor points for particles. The same `rng(seed + ':' + kind)` keeps every flower identical to its 2D twin. Then build geometry:

| part | geometry | material |
|---|---|---|
| stem | 1px `LineSegments` along the sampled stem curve (as built; the 1px SVG stroke read better than a tube) | `stemColor` = 45% flower colour, 55% fog (oklab) |
| petal fill | triangulated petal outline, cupped toward the viewer around the head (`z = 0.35·r²`, tuned in the sandbox) | custom shader: colour × (0.62 vivid / 0.34 fading) opacity, `toneMapped: false` |
| petal outline | `Line2` (drei `<Line>`) on the same path, width 1px | colour, opacity 0.85 (ghost: `ghost` 0.4, no fill) |
| leaves | same as petals at 0.2 width ratio | `stemColor`, fill 0.35 |
| centre | small light-coloured disc (r 2.6px, part of the fill mesh) | `light` #ffd9a0 × (1 + 1.0·glow), feeds the bloom pass |
| place florets | `InstancedMesh` of 5-petal ellipses, 22–34 per flower | per-instance colour |
| halo | camera-facing quad, radial gradient, additive blending | colour × 0.5 vivid / 0.2 fading; breathes scale 1 → 1.06 over 7s |

**Facing.** Each flower's group turns around Y to face the camera (`group.rotation.y = atan2(cam.x − x, cam.z − z)`), and petals keep a slight z-depth so parallax still reads as 3D.

**As built** (`src/scene/flower/`): `generator.ts` → `geometry.ts` → `materials.ts` → `Flower.tsx`. Each flower is one merged fill mesh (triangulated shapes), one `LineSegments` (1px outlines and stems), one `Points` cloud (lost motes), one halo quad and an invisible hit plane: 4 draw calls, all sharing one uniform set. Per-vertex `aPart` (petal / stem / light) and `aAlpha` carry what the SVG set per element.

**Twin check.** The generator keeps bundle.js's exact random-call order. All 24 seed and kind combinations tested put the head where the SVG puts it, and the shape counts match.

**Glow (tuned):** fill × (1 + 0.2·glow), lines × (1 + 0.15·glow), light parts × (1 + 1.0·glow), halo colour × (1 + 0.4·glow), halo alpha = (halo·(1−r))² × 1.2. Sway is two seeded sines, ±0.012 of height (ghost 0.008).

**Per-flower uniforms** (set from views, lerped over 3s):

| uniform | vivid | fading | ghost | lost |
|---|---|---|---|---|
| `uColor` | kind colour | 50% toward fog (oklab) | 30% | fog |
| `uFill` | 0.62 | 0.34 | 0 | 0 |
| `uLine` | 0.85 | 0.85 | 0.4 | 0.12 |
| `uGlow` (bloom drive) | 1.0 | 0.45 | 0 | 0 |
| droop (stem lean, share of height) | 0 | 0.03 | 0.07 | 0.05 |
| sway amplitude (share of height) | 0.012 | 0.012 | 0.008 | 0 |

Use `flowerColor(kind, state, hue)` from `src/engine/color.ts`. It is tested to match the `*-fading` tokens exactly.

**Ghost text loss** is in the DOM (Recollection). **Ghost petals fall one by one:** each ghost flower drops one petal every ~20s until 40% have fallen (seeded, so the same petals fall each visit). *As built (13 Oct):* each petal shape carries `aFall`, its seeded turn (only the first 40% of petals by turn ever fall; −1 for everything else), in the existing fill and line meshes. While a flower looks like a ghost (and on into lost), `uFallT` counts seconds; petal *k* starts to fall at `uFallFirst` (4–12s, seeded per flower) + 20s·*k*, sinks `head height` over 7s with a slight sway, and has faded by 95% of the way. Tended back to life, it is whole again. Reduced motion: no petals fall. No extra draw calls.

## Threads

| thing | value |
|---|---|
| curve | `QuadraticBezierCurve3(headA, mid + up · 0.28 · distance, headB)`, 48 samples |
| core | drei `<Line>` width 0.6 + 0.8·s px, colour `thread` × (0.55 + 0.8·s), opacity 0.12 + 0.6·s (was × (0.6 + 1.2·s), which blew the core to white glare under bloom; p3 shows a soft warm line) |
| glow | second line width 3 + 6·s, opacity 0.02 + 0.05·s (bloom does the rest) |
| pulse | shader on the core: a Gaussian bright spot moving along u every 4–7s (seeded period); only if s > 0.3 |
| motes | 2–4 points travelling along the curve over 7–13s when s > 0.3 |
| flicker | if either end is ghost: opacity × (0.75 + 0.25·noise(t·3)) |
| hover | brighten the hovered flower's threads × 1.4 and dim the rest × 0.35 |
| suggested (planting) | dashed (`dashed`, dashSize 0.06, gapSize 0.05), opacity 0.5, no pulse |
| as built | `src/scene/thread/ThreadArc.tsx`: two drei Lines (glow, core) plus one additive point cloud (index 0 = pulse, the rest = motes) moved along the curve each frame. The pulse crosses in 1.8s, then rests until its seeded 4–7s period comes round. Strength eases over ~3s and hover emphasis over ~0.4s. Brightness = `threadBrightness()` in the engine. Hover or focus both light a flower's threads. |

## Fog

- **Fog banks** (`src/scene/fog/FogBanks.tsx`): 8 low, wide, Y-billboarded planes (8–18 units wide, 1.1–2.6 tall, bottom on the ground) with an fbm noise shader in `fog` #8a93a6, each drifting on a 40–90s loop. About 3 thin banks overlap on any line of sight, so each carries `fog-thin / 3` (0.02); the total reads as fog-thin. Peak alpha = opacity × 1.1 (`GAIN`).
- **Memory banks:** one per memory, just in front of it. Opacity 0 when vivid, 0.07 when fading, `fog-thick` 0.14 when ghost or lost, eased over ~3s.
- **No cut lines:** alpha fades to 0 at the ground (`smoothstep(0, 0.7, worldY)`), so a vertical plane never shows where it meets the ground.
- **Density follows neglect:** thin opacity = (0.06 + 0.10 × share of memories that are not vivid) / 3.
- **Ground** (`src/scene/ground/Ground.tsx`): #0d1119, lifted under each thread-connected cluster by its average vitality, with two faint elliptical rings per cluster (screens p1/p3), fading to night beyond about 9–24 units. Toward the viewer it lifts toward `fog`: 5% (linear light) from z 0.5 to z 6, the bottom of the home frame, which reads about #1c2026, matching the floor of screens p3 (brightness 30 there, 31.5 here). *Look frozen 13 Oct (`docs/look-log/20261013-1100-look-freeze-garden.png`).*
- **Depth:** fainter memories sit behind thicker fog. Put one bank between the camera and each ghost.

## Tending feedback (P5)

| beat | value |
|---|---|
| light mote | DOM dot, 6px, `light` + `glow-light`, from the dimmed counter dot to the flower head in 600ms, ease-in-out, rising in a 60px arc, re-aimed every frame |
| counter dot | dims over 0.6s (CSS transition) |
| flower swell | glow +0.9, halo +0.35: rises over 0.4s (sine), settles over 1.6s (quadratic) |
| ripple | a point at 2× pulse brightness crosses each of the flower's threads in 900ms, away from it; the core brightens up to ×1.8 as it passes; shown even on faint threads |
| neighbour swell | starts when the ripple arrives (+900ms) |

All of it is skipped with `prefers-reduced-motion`, except the state change itself.

## Hero moments (timings from the storyboards)

**The bloom: 1.6s, then breathing**

| ms | beat |
|---|---|
| 0 | a seed (small glowing ellipse) falls from y = 2.5, ease-in |
| 250 | it lands: one ripple ring expands on the ground (r 0 → 0.6, fades) |
| 500 | roots spread as light: 3–5 short lines below the ground, `drawRange` 0 → full |
| 800 | the stem rises: tube `drawRange` (or scale.y) 0 → 1, ease-out |
| 1200 | petals unfold: each petal rotates from closed (folded up 80°) to open, staggered 40ms |
| 1600 | the glow settles: halo 0 → target, then breathing starts |

*As built:* `src/scene/fx/bloomTimeline.ts` (pure, tested) drives everything. The flower's own shaders reveal stems and leaves from the ground up (`uGrow`) and open petals and light parts out from the head (`uUnfold`, 6% → 100% scale, fading in). `BloomGrowth.tsx` draws the seed, the ground ripple (ring r 0 → 0.6) and 3–5 seeded roots on the ground (drawRange). Halo and glow settle over 1.4–2.2s. Petals open together rather than staggered 40ms (the merged mesh has no per-petal id; a stagger would need one). Reduced motion: a 0.6s crossfade.

**The dissolve: 4.5s, unhurried, never alarming**

| s | beat |
|---|---|
| 0 | a ghost |
| 0.8 | petals detach and drift (each petal gets a small velocity up and outward) |
| 1.6 | petals turn into particles: swap the meshes for ~44 points sampled from the generator's `anchors` |
| 2.6 | its threads flicker (noise opacity) |
| 3.6 | the last thread goes out (opacity → 0 over 0.8s) |
| 4.5 | an empty spot with a small dark seed (dark ellipse + faint ring) that can be returned to |

**The garden grows in.** Entering the demo garden ("see a garden", "watch a season", reset demo garden, or a `?demo` link), every memory blooms through the beats above, left to right, 160ms apart, starting 450ms after the threshold has faded (1.8s after load on a `?demo` link). Each seed waits glowing in the dark until its turn, so the threshold's single seed becomes ten. Threads stay hidden until both their flowers have grown, then light with the first-thread pulse. Sound: each flower's own note as its seed lands (−28 dB), never a chord. *As built:* `growIn` in `src/store/garden.ts` (quiet `bloom` events), `prepareDemo`/`openDemo` so the threshold never reveals a grown garden that then regrows.

**The first thread.** When a plant creates its first thread: a light pulse runs from the new flower to the neighbour (0.9s), the thread then fades in, and the chord plays.

**The reveal.** Rise to the overview. Every flower not held by the chosen person or place dims to 15%, and its threads to 5%. The held threads brighten × 1.6, and labels show beside each held flower (DOM, `interface-sm`).

## Return replay and dissolve (P7, as built)

- **Replay** (`arrive()` in the store): the scene draws `shown`, not `views`. On arrive, `shown` starts as the garden was at the last visit; memories that changed move to their new state one by one, 260ms apart, most changed first, each easing over ~3s, and fog, ground and threads follow `shown`. Lost memories start to dissolve 1.5s after their turn; ghosts newly about to be lost "beckon" (a 2s swell of halo) 3s after theirs. Any action ends the replay.
- **Dissolve** (`src/scene/fx/dissolveTimeline.ts`): 0–1.6s the ghost's look; 0.8–1.6s petals and light parts drift off the head and fade (`uDetach`); 1.6–4.5s the particles scatter once from the flower's anchors (`uScatter`); 1.6–3.6s stems fade to half; 3.8–4.5s the dark seed appears (`DarkSeed.tsx`); then the lost look settles (particles drifting at 0.55).
- **Threads to a dissolving memory** stay drawn after the engine drops them: they flicker from 2.6s and go out at 3.6s over ~0.8s (`threadDeparture`). Every thread also has its own visibility fade, so a thread waiting for its first pulse or gone out is fully invisible, not left at the core's 0.12 floor.
- **Slider**: scrubbing previews (threads to memories that look lost are hidden), **arrive** replays, **reset demo garden** puts the ten sample memories back.

## Post-processing

| pass | settings | low quality |
|---|---|---|
| Bloom (`mipmapBlur`) | intensity 0.85, luminanceThreshold 0.3, smoothing 0.45 | intensity 0.65, no mipmap |
| Vignette | offset 0.3, darkness 0.75 | same |
| Noise (film grain) | opacity 0.025 | off |

DPR is clamped to [1, 1.75]. Quality drops automatically if drei `PerformanceMonitor` reports a decline.

## Contest film presentation

Decisions D25 and D26 extend the reference rendering for the fictional episode. The three-minute film makes two visits to the same life, with all state changes coming from the engine. Episode captions use `memory-lg` (32px) during the film and `memory` (24px) in play, in `text-primary`. Title cards use the existing `title` style (40px) in the sky at 15% of viewport height. Captions fade in over 1.2s and titles over 1.8s; reduced motion removes these animations. A soft, edgeless band of night behind the words preserves their contrast against threads.

Living flowers release pollen through one additive point cloud: vivid 7 motes at alpha 0.55, fading 3 at 0.3, ghost and lost none. Motes rise 1.1 world units over 7–11s and dim to 35% while a memory is open or a relationship holder is emphasized. Reduced motion removes the drifting pollen. Cluster ground pools use vitality-weighted living flower colors, mixed halfway toward fog, at 0.06 × lift + 0.035 × ring. Threads keep their original warm ivory color.

The ending keeps the rest of the changed garden at 45% flower opacity and 40% thread strength while emphasizing an actual surviving holder. The standard interactive reveal retains its existing dimming. Color, ghost outlines and dark seeds remain part of the composition.

## Reduced motion

`prefers-reduced-motion`: keep every state's look, but stop the camera drift, sway, breathing, thread pulses, motes and fog drift. Bloom and dissolve become 0.6s crossfades.

## Never

- Never use red, warning colours, error shakes or countdowns.
- Never use bouncy easing. Everything is ease-in-out or exponential damping.
- Never colour a thread with a flower's colour. Threads are always `thread` #fff4e0.
- Never put a flower in a box, card or list.
- Never use the generic Three.js demo look: no default lights, no grid, no `MeshStandardMaterial` grey, no OrbitControls spin.
