# Lethe

A web garden where you plant memories as flowers, fog slowly erases them, and only connected memories survive. 3D (React Three Fiber), local-first, dark only, desktop 1440 × 900 first.

## Read before working

- `docs/build-plan.md`: what to build next. Do one task, then stop.
- `docs/decisions.md`: where plan, screens and design system disagreed, and who won. **Follow it over anything else.**
- `docs/scene-spec.md`: every visual rule as a 3D number. `docs/systems.md`: the rules of the garden. `docs/architecture.md`: diagrams.
- `lethe-design-system/README.md`: brand, voice, tokens. The design system is the source of truth for colour, type and the DOM components. **Import its CSS, never copy or edit it.**

## Commands

```
npm run dev         # http://localhost:5173 · press ` for the hidden time slider · ?days=21 previews 3 weeks ahead · ?quality=low
npm test            # engine tests (vitest) — keep green
npm run typecheck
npm run sim         # forgetting simulation: npm run sim -- daily|lazy|none
npm run build
```

Tagging works with no key: the offline tagger runs in the browser. Optional upgrades, server-side only, in `.env` or Vercel: `GROQ_API_KEY` (free tier) or `ANTHROPIC_API_KEY` (Claude wins if both are set).

## Architecture rules

- `src/engine/` is pure TypeScript: no React, no Three, no clock, no storage. Time is always a parameter (`now` = garden day, `realNow` = ms). Every tuning number of the garden's rules lives in `src/engine/constants.ts` (design-token mappings such as `STATE_COLOR_SHARE` stay beside their tokens). Changing a rule means updating the test in `engine.test.ts` too.
- Vitality and state are **derived** (`viewAll(garden, now)`), never stored.
- Only `src/store/garden.ts` (and data factories such as `sampleGarden`) call engine actions. Scene and UI read `views` from the store.
- DOM interface components live in `src/ui/ds.tsx` and use the design-system class names exactly. Flowers and threads are 3D (`src/scene`), never DOM or SVG at runtime.
- Provider keys never reach the client. `/api/tag` → `server/tag.ts` is the only call to a tagging provider (Claude or Groq), and planting never waits for it: offline tags first, `retag` when a provider answers.

## The four pillars (check every change against them)

1. **Forgetting is beautiful, not punishing.** Fading is dusk, never failure.
2. **Connection is the only defence.** Memories survive through shared people, places and feelings.
3. **Every choice costs something.** Light is scarce, so tending is choosing.
4. **The garden reveals you.** Its shape shows what holds a life together.

## Never

- Never use red, warnings, error states, countdowns, streaks, scores, badges, percentages or progress bars, or "you haven't…".
- Never use the words delete, save, submit, sync, streak or score in the interface. Use plant, tend, let go, return. (Single exception: the confirm step of "let the garden go", see D12.)
- Never add emoji or exclamation marks. Interface words are lowercase. Dates are human: "planted 3 january 2011". The separator is ` · `.
- Never add icons. Kinds are coloured seed dots, light is a dot, actions are words.
- Never add sidebars, cards, tabs, menus, toasts or dashboards. One Overlay at a time, opened by the person.
- Never use filler memories. Reference demos use the ten sample memories in `src/data/sample.ts`, with their exact words. The authorized contest episode also uses the thirteen authored memories and two planting choices in `src/data/episode.ts`.
- Never use bouncy or fast motion. A flower grows over 1.6s, a state change eases over ~3s, halos breathe on 7s, fog drifts on 40–90s.
- Never colour a thread with a flower's colour, and never re-seed a memory (the same id always grows the same flower).
- Never use the generic Three.js look: no default lights, grey standard materials, grids or spinning orbit.
- Never send anything but the memory text and known entity names off the device.

## Working style

The owner authorized the single-season contest episode on 13 October: a paused fictional demo, one remaining light, one pre-season planting, a 21-garden-day transition, and an acceptance ending. This lifts the feature freeze only for this scoped implementation. Personal time, privacy, engine formulas, and the completed performance fixes stay intact. The requested implementation spans the ordered episode tasks; finish the authorized scope, leaving each handoff green.

- One small task per session; commit after each working step.
- Describe looks with numbers ("bloom 1.1, fog bank opacity 0.06"), not adjectives. Compare screenshots with `docs/look-log/` and the screens PDF.
- When a visual task is done, save an approved screenshot to `docs/look-log/YYYYMMDD-HHMM-<what>.png`.
