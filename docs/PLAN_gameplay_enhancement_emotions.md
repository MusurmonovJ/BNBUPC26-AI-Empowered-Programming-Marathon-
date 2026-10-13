# Lethe contest implementation plan: grow, choose, let go

## 1. Goal, scope, and project rules

Build a **24-flower, single-season experience** that makes visitors care about memories, choose what to tend, and understand that a life can remain meaningful while some moments fade.

The emotional progression is:

**Curiosity → attachment → care → choice → loss → acceptance.**

Deliver two experiences using the same garden and engine:

- **Playable season:** visitors make their own choices without a time limit.
- **90-second film:** a rehearsed path through genuine actions and consequences, suitable for recording and presenting.

Keep the larger three-chapter campaign as future work. The immediate implementation budget is **12–16 focused hours**, including testing and presentation preparation.

### Preserve the completed work

Performance is fixed. Preserve the current camera behavior, shader warm-up, scene readiness, quality adaptation, and resource reuse. Only check for regressions introduced by new content and presentation.

Also preserve:

- Pure TypeScript engine with time passed explicitly.
- Derived vitality and memory states.
- Store-owned engine actions.
- Deterministic flower identities.
- Existing retention, thread, tending, and return formulas.
- Personal garden persistence and real-time rules.
- Offline-first personal tagging and server-only provider keys.
- Design-system CSS and the restrained botanical appearance.

### Record authorized exceptions before implementation

Update the project instructions and decisions first:

- Allow the explicitly authored additional fictional memories below.
- Allow a paused, demo-only clock with one explicit seasonal transition.
- Allow the fictional episode to start with **one remaining light**.
- Replace the current story’s automatic return beat with an acceptance ending.
- Lift the feature freeze for this scoped contest work.

Retain the prohibitions on scores, badges, countdowns, progress bars, warning colors, guilt, dashboards, icons, and rapid motion.

All new interface copy is lowercase. Memory quotations retain their original wording.

Follow the existing ownership protocol: Claude implements and writes primary behavior tests; Spark handles separate regression tests, review, documentation, green-keeping, and commits. Preserve unrelated changes in the current dirty worktree.

## 2. The garden and its meaningful choices

### Episode size and content

Start with **23 authored memories**. Allow one free planting during the episode, bringing the garden to **24**.

Keep the existing ten sample memories’ words and entity associations unchanged. Add thirteen distinct memories representing the same fictional life.

Use stable IDs `ep-e1` through `ep-e13`. New memories have the listed people and places; leave their feelings empty to avoid creating incidental connections that weaken the intended contrast.

| ID | Kind | Exact memory text | People / places |
|---|---|---|---|
| e1 | sentence | “Let it steep a little longer.” Grandma Mei taught me to make tea. | Grandma Mei / Hangzhou |
| e2 | photo | Grandma Mei’s hands folding dumplings in Hangzhou. | Grandma Mei / Hangzhou |
| e3 | place | Grandma Mei’s balcony in Hangzhou after the rain. | Grandma Mei / Hangzhou |
| e4 | song | The tune Grandma Mei hummed while washing cups. | Grandma Mei / Hangzhou |
| e5 | photo | Leo asleep against the night-bus window. | Leo / — |
| e6 | sentence | “We missed the last train.” Leo laughed before we started walking. | Leo / — |
| e7 | place | The station outside Kamakura, waiting with Leo. | Leo / Kamakura |
| e8 | place | Dad’s workbench, covered in pencil shavings. | Dad / Dad’s workshop |
| e9 | photo | Dad holding the bicycle while I tried again. | Dad / — |
| e10 | sentence | “Try once more.” Dad stayed beside me. | Dad / — |
| e11 | photo | Rain on a train window, somewhere I no longer remember. | — / — |
| e12 | place | A roadside field seen once through a train window. | — / roadside field |
| e13 | song | A melody from a shop I never found again. | — / — |

Photo memories can use caption-only presentation, consistent with the existing sample garden. Do not add stock photographs or a media download dependency.

Clearly identify this as a fictional example life.

### Establish a convincing history

Create an episode factory in `src/data/episode.ts`.

Build all starting memories and threads before assigning their initial ages:

- Original samples use their original vitality targets, with the episode-only exceptions below.
- The rooftop, `m10`, starts at vitality `0.9`, so visitors can read it before its loss.
- Additional memories start at `0.9`, except e12 at `0.4` and e13 at `0.18`.
- Six longstanding memories—e2, e4, m4, e7, m8, e9—represent three prior tends. Calculate their stability from existing constants, then initialize them at vitality `0.95`.
- Initialize vitality through the engine’s fixture helper, never by storing a vitality field.
- Start at a fixed episode garden day, with one light and an unused planting allowance.

This produces a garden with established memories, fragile fragments, and visible history. After the season, some flowers remain colorful, some become outlines, and others leave seeds.

Do not change global balance constants to obtain this appearance.

### Layout

Arrange four readable regions:

- Grandma Mei and Hangzhou.
- Leo and shared journeys.
- Dad and family care.
- Scattered, loosely connected moments.

Provide a complete deterministic position map for the episode.

Use larger anchor flowers and smaller supporting flowers, with space for words and threads. Keep the rooftop visible and easy to select. Its position must remain recognizable after it becomes a seed.

Do not compress 24 full-size flowers into the original ten-flower composition. Use the existing expanded exploration controls and overview distance.

### The last-light choice

The visitor can tend any living flower once, spending the episode’s remaining light.

Highlight the actual living neighbors that tending will affect. Reuse existing thread emphasis and ripple behavior.

Provide a short explanation:

> `one light remains. tending a memory also reaches what is connected.`

The important contrast:

- Tending Grandma Mei’s sentence helps its connected memories.
- Tending the rooftop keeps an individually meaningful place alive longer.
- Neither choice receives a success label or judgment.

Do not limit selection to two special buttons. The whole garden remains interactive.

### Planting choices

Inside the existing planting overlay, offer two plain-text fragments:

- `Tea with Grandma Mei in Hangzhou.`
- `Leo and me on the library rooftop at university.`

Use stable IDs for these choices and validated local tags.

The first deepens an existing region. The second connects the rooftop to Leo’s memories.

Selecting a fragment shows its real dashed thread preview. Pressing `plant` plays the existing bloom and first-thread sequence.

Also allow `write a memory`, using the existing field and offline tagging. Any planting consumes the same single episode allowance.

Planting and tending can happen in either order. Both are optional.

### Advance the season

A quiet `let a season pass` action advances the garden **21 garden days**, once.

Three weeks are a fictional episode transition; do not describe them as a newly invented real-time rule.

Use the existing stepped advancement and loss cascades. Do not force the rooftop or another specific memory to disappear.

The important outcomes must emerge naturally:

- Grandma Mei tending plus the tea planting leaves her sentence stronger while the rooftop becomes a seed.
- Rooftop tending preserves the rooftop as a ghost.
- Planting the rooftop fragment can preserve it through connection.
- Other fragile memories may fade regardless.

These branches were checked against the current engine during planning. Pin the final factory’s exact outcomes in tests.

## 3. State, actions, and lifecycle

Implement episode coordination in `src/store/garden.ts`.

### Minimal session state

Add:

- Mode: reference demo, playable episode, film episode, or personal garden.
- Episode stage: exploring, passing, reflecting, or finished.
- Fixed current episode garden day.
- Planting allowance used.
- Successful tended, planted, returned, and let-go IDs.
- Session generation for invalidating asynchronous work.
- Before/after views and advancement summary.
- Presentation cue and chosen reveal holder.

Personal mode continues using its existing real-time clock.

### Store actions

Add these episode actions:

- `beginEpisode(mode)`
- `plantEpisodeChoice(choiceId)`
- `advanceEpisode()`
- `finishEpisode()`
- `continueEpisode()`
- `restartEpisode()`

Existing tending, planting, letting-go, and returning actions route through episode eligibility when an episode is active.

Successful engine mutation must precede its feedback event. An unavailable tend or return must never emit a success animation.

### Transition transaction

`advanceEpisode()`:

1. Guards against duplicate activation.
2. Captures the current views.
3. Calls the engine’s stepped `advance()` for the next 21 garden days.
4. Records actual state changes and losses.
5. Updates the episode clock.
6. Starts the existing visual replay.
7. Opens the reflection once the replay and dissolve sequences finish.

Do not call real-day light grants or fabricate personal timestamps.

Bound the spread of replay start times to **1.2 seconds** across the garden. Preserve each flower’s existing easing and dissolve duration.

During the transition, allow exploration but temporarily prevent mutations and duplicate advancement. Restore actions at the appropriate finished stage.

### Continue after the ending

After the final composition:

- `continue tending` grants three demo light once, capped by the existing maximum.
- Return remains an explicit visitor action.
- The clock stays paused.
- Allow up to three additional demo plantings.
- `play again` resets the episode.
- `begin your own` uses the existing personal-garden entry.

Do not automatically resurrect anything.

Clear the closing caption when the visitor resumes gardening.

### Isolation and cancellation

The episode is session-only and never writes to personal IndexedDB records.

On reset or mode changes:

- Cancel presentation timers and replay work.
- Abort obsolete tagging requests.
- Clear stale captions and hover/focus state.
- Ignore responses belonging to a previous session generation.

Use the current scene-ready mechanism before scheduling grow-in and film playback. Preserve its timeout fallback.

## 4. Attachment, beauty, and the signature ending

### Introduce memories before their consequences

The guided film must show both:

- Grandma Mei’s original sentence in full.
- The rooftop’s original words while it is vivid.

Give each enough time to be read. Keep their positions recognizable later.

Explain connections after introducing the memory, so the audience first encounters a life fragment rather than a system diagram.

### Growth

Reuse the existing seed, landing, roots, stem, petal, glow, and first-thread sequence.

Allow roughly three seconds after planting for the flower and its first connection to finish.

The new memory should visibly find its place in the garden.

### Loss

Reuse the implemented:

- State easing.
- Specific-word loss and falling-word animation.
- Ghost petal fall.
- Dissolve particles.
- Departing threads.
- Dark seed.

Do not add another particle system or reward bloom when a memory is lost.

Keep cinematic framing near the flower during its dissolve, then reveal the seed. The camera should not prematurely frame the ground simply because the engine has already marked that memory lost.

Implement this as a presentation-target adjustment using the existing camera goal behavior; preserve manual camera controls and gesture cancellation.

After the dissolve, hold the quiet space for **four seconds**.

### Sound

Use the current sound system:

- Gentle landing note during growth.
- Existing tending chime and answering neighbors.
- Existing first-thread chord.
- Existing fading loss note.

Lower the ambient presence modestly during the quiet hold, then restore it gradually for the wide reveal. Preserve mute behavior and the existing limiter.

The experience must remain understandable without sound.

### Signature final composition

The ending lasts approximately **14 seconds**:

1. Move toward the existing overview framing over about three seconds.
2. Show the entire changed garden, including colorful flowers, outlines, and quiet spaces.
3. Gently emphasize an actual surviving relationship group.
4. Reveal a few readable memory names.
5. Hold the composition while the closing words appear.

Select the strongest living holder for the film. In playable mode, acknowledge the visitor’s actual tended or planted memory before emphasizing a holder.

Use existing brightness/emphasis uniforms. Decorative illumination cannot alter vitality, add relationships, or imply a second tending action.

Keep dark seeds visible enough that loss remains part of the composition.

### Closing copy

Show these lines sequentially:

> `you cannot keep every moment in bloom.`

> `what you tend gives the garden its shape.`

Do not reuse the current “a garden that kept everything would have no shape” line.

Playable reflections may include one factual action-specific line:

- `you tended grandma mei’s words.`
- `you returned to the library rooftop.`
- `the rooftop found a thread to leo.`

Generate such lines only when the corresponding action or relationship exists.

Loss means leaving the foreground. Original words and returnable seeds remain intact.

## 5. Playable entry, film, and presentation

### Entry routes

- `?demo`: preserve the current ten-memory reference garden.
- `?demo=play`: open the playable episode.
- `?demo=film`: offer a gesture-started film episode.
- Main threshold: replace the sample-garden invitation with `play a season`; keep `watch a season` and personal entry.
- `watch a season`: starts the new film episode.

Neither film timers nor audio begin before the required gesture and scene readiness.

The playable episode does not automatically advance time or make gardening choices.

### Film timeline

Refactor `src/ui/story.ts` into a cancelable presentation sequence using store actions.

Target **90 seconds after readiness and the starting gesture**:

| Time | Beat |
|---|---|
| 0–8s | Garden grows in; introduce life fragments |
| 8–17s | Read Grandma Mei’s sentence and reveal its connections |
| 17–23s | Read the vivid rooftop memory |
| 23–39s | Preview and plant the tea memory; let bloom and threads finish |
| 39–49s | Spend the remaining light on Grandma Mei; show spillover |
| 49–53s | Explain the seasonal transition |
| 53–66s | Advance; frame the actual rooftop dissolve; hold the quiet space |
| 66–80s | Rise to the changed garden and illuminate surviving relationships |
| 80–90s | Closing lines and final held composition |

Use locally validated tags for the film’s authored planting. Do not wait on a provider or depend on automatic typing to trigger tagging.

Remove the automatic rooftop return from the film.

Use an active presentation clock: hiding the browser pauses playback rather than skipping unseen beats. Stop playback on explicit stop, manual camera interaction, another action, or keyboard input; stopping leaves the live episode usable.

Reset all transient presentation emphasis on stop.

### Three-minute presentation

Use the same experience:

- First 20 seconds: explain life fragments becoming a world.
- Next 90 seconds: film or rehearsed live path.
- Next 50 seconds: demonstrate a different choice, optional return, or a visitor planting.
- Final 20 seconds: hold the reveal and invite people to try the project.

Prepare two recordings: the 90-second core film and a three-minute narrated version.

Keep recorded footage faithful to the engine. Film editing may shorten navigation and typing, but must not manufacture survival outcomes.

### Submission materials

Update the contest kit with:

- New playable and film URLs.
- Exact rehearsal route.
- Voiceover aligned to the timeline.
- A fallback video.
- One opening still and one final reveal still.
- Brief explanation that the example life is fictional and personal gardens stay local.

Recommended public description:

> “Lethe turns fragments of a life into a living garden. Plant memories, discover their connections, and choose what to tend. As seasons pass, some moments fade—and the garden reveals what holds a life together.”

Place the real voting link in the submission materials when available.

## 6. Tests and acceptance gates

### Factory and engine outcomes

Test the final episode fixture:

- Exactly 23 starting memories with unique IDs.
- Original sample words and associations preserved.
- Every new fragment has its specified tags.
- Only established-history memories receive additional prior-tend stability.
- Initial rooftop words are fully readable.
- One planting produces 24 memories.
- Shared entities generate genuine threads.
- The 21-day transition uses normal loss cascades.

Pin the four branches:

1. Grandma Mei tend plus tea planting.
2. Rooftop tend plus tea planting.
3. Grandma Mei tend plus rooftop planting.
4. No actions.

Verify meaningful differences in rooftop survival and Grandma Mei’s resulting state. Verify a mixture of vivid, ghost, and lost memories remains in the ending.

Never override simulation results to meet a visual target.

### Store and presentation

Verify:

- Double-clicking cannot spend light or advance twice.
- One pre-season planting allowance is enforced.
- Failed actions emit no success feedback.
- Continue grants light only once.
- Episode time remains paused during exploration.
- No episode data enters personal persistence.
- Late tagging and timers cannot cross session boundaries.
- Film cancellation works during every beat.
- Backgrounding pauses the film.
- The film ends without automatic resurrection.
- Reflection copy never invents an action.

### Visual and accessibility checks

Check Chrome and Edge at 1440 × 900:

- All flowers and seeds are reachable.
- Words remain readable and inside the viewport.
- Tending previews match actual neighbors.
- The rooftop is recognizable before and after fading.
- Dissolve framing stays on the correct subject.
- Quiet spaces remain legible in the final view.
- Keyboard users can plant, tend, advance, stop, and return.
- Reduced motion uses the existing crossfades and suppresses cinematic motion and pulses.
- Muted and offline experiences complete correctly.

Use the corrected performance as the baseline. Run one comparison through grow-in, tending, planting, transition, and reveal; only address regressions caused by this implementation.

### Required checks

Run tests, typechecking, all three existing simulation modes, and a production build.

Capture approved screenshots for:

- Opening garden.
- Familiar memory and its connections.
- New planting.
- Tending ripple.
- Dissolve and quiet space.
- Final composition.

With three unfamiliar visitors, confirm they understand what flowers and threads represent, how tending affects neighbors, and why their choices changed the garden.

## 7. Implementation sequence and time budget

Add the work as ordered, unchecked tasks in the build plan. Complete one working step per handoff.

| Step | Deliverable | Budget |
|---|---|---:|
| 1 | Record scoped decisions and acceptance gates | 0.5h |
| 2 | Authored factory, layout, and branch tests | 2h |
| 3 | Episode state, clock, allowances, transition, and isolation | 3h |
| 4 | Planting choices, consequence feedback, and playable entry | 2h |
| 5 | Film sequence, quiet hold, and final composition | 2h |
| 6 | Regression checks, browser checks, and stranger testing | 2h |
| 7 | Voiceover, screenshots, recordings, and production verification | 1.5h |
| **Planned total** |  | **13h** |

Reserve up to three additional hours for failed acceptance gates.

If time runs short, cut custom-memory planting within the episode, extra reflection variations, and decorative final illumination first. Preserve the two authored planting choices, last-light decision, genuine seasonal consequences, quiet hold, and complete ending.

Deployment follows successful checks and uses the project’s established authorization workflow.

## 8. Deferred expansion

Keep these ideas in a later roadmap:

- Three-chapter, 36–39-memory progression.
- Repeated playable seasons and chapter light grants.
- First-planting connection previews in personal gardens.
- Entity correction and intentional manual connections.
- Local bulk planting.
- Seasonal atmosphere changes.
- Privacy-aware garden portrait export.
- Additional authored lives.
- Larger-garden renderer work if subsequently needed.

The contest release should stand on its own: **a visitor grows something, understands its relationships, makes a real choice, witnesses beautiful loss, and leaves with a garden whose shape makes sense.**
