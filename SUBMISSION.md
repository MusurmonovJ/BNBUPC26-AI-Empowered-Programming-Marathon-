# Lethe

**A garden that forgets**

**Topic:** 3 · Your Life as a World · Culture and Creativity

[Play the fictional season](https://lethe-nine.vercel.app/?demo=play) · [Watch the three-minute film](https://lethe-nine.vercel.app/?demo=film) · [Begin a personal garden](https://lethe-nine.vercel.app/)

## The project

Lethe turns fragments of a life into a living garden. Plant memories, discover their connections, and choose what to tend. As seasons pass, some moments fade, and the garden reveals what holds a life together.

A sentence, a song, a place and a photograph can share someone or somewhere. Their flowers become joined by threads. Those relationships affect how long the memories remain in bloom. Tending spends scarce light and also reaches connected neighbors. A fading memory becomes an outline; a lost flower leaves a seed and retains its original words.

The garden organizes memories through their relationships and makes those relationships something a visitor can experience and influence. Its shape reflects attention, care and the fragments of a life that remain connected.

## What to try

The fictional example starts with 23 memories, one remaining light and one free planting. Its clock stays paused during exploration. Plant a fragment, tend a memory, then let three garden weeks pass. Different choices produce different outcomes through the same engine.

The three-minute film demonstrates two visits to the same life. The first loses the rooftop flower. The second connects it to Leo, and it remains as a ghost. Both visits use real planting, tending and advancement actions. The film does not fabricate survival outcomes or automatically resurrect memories. Any click, scroll or key returns control to the visitor.

Use desktop Chrome or Edge, around 1440 × 900 or larger. Sound starts with the first interaction. A mute control and reduced-motion support are available. The original ten-memory reference garden remains accessible at `?demo`.

## Submission materials

| Material | Location or status |
|---|---|
| Live website | https://lethe-nine.vercel.app/ |
| Playable episode | https://lethe-nine.vercel.app/?demo=play |
| Three-minute film | https://lethe-nine.vercel.app/?demo=film |
| Opening image | [Garden](docs/screenshots/garden.png) |
| Ending image | [Final composition](docs/screenshots/ending.png) |
| Recording and narration guide | [Contest kit](docs/contest-kit.md) |
| Presentation and PowerPoint files | [Presentation package](docs/presentation/README.md) |
| Recorded video URL | Pending the owner's recording and upload |
| Voting URL | Pending the organizer's actual voting destination |

Attach the recorded video and the actual voting link when available. Their destinations are not invented here.

## Key decisions and trade-offs

| Decision | Purpose and trade-off |
|---|---|
| Exponential forgetting model | Time, tending and connection produce predictable consequences. This is a game model, rather than a measurement of a person's real memory. |
| Shared entities form threads | Separately written fragments discover a relationship through shared people, places or feelings. Automatic tagging can be imperfect; an offline base keeps planting responsive. |
| Connection bonus is capped | Well-connected memories endure longer without becoming permanently immune to fading. |
| Scarce light | Tending becomes a meaningful choice. Personal gardens grant light through real time; the fictional episode begins with one light. |
| Returnable seeds | Loss leaves the foreground while the original words remain. Returning is an explicit action. |
| Paused fictional episode | A short visit can show a season's consequences without changing personal time or persistence. |
| Procedural botanical rendering | Stable flower identities, fog, glow and parallax create a garden with depth. Rendering quality adapts to slower devices. |
| Local personal persistence | Personal gardens and photos stay in IndexedDB. They are specific to the browser and device. |

See [the decision log](docs/decisions.md) and [engine systems](docs/systems.md) for the implementation details.

## How AI is used

**In the product:** an optional server-side provider extracts people, places and feelings from one memory. The browser performs local tagging first. If configured, `ANTHROPIC_API_KEY` selects the Anthropic provider; otherwise `GROQ_API_KEY` selects Groq. Keys are server-only. With neither key, the garden still works using the local tagger.

**In development:** Claude Code and Codex helped implement, review, test and document the project under the creator's direction. The concept, four pillars, authored example life, visual rules and implementation decisions are recorded in the repository. AI assistance does not change the simulation outcomes for the film.

## Example data and privacy

The 23 starting episode memories and two offered planting fragments are authored fictional content. The original ten-memory reference garden is also fictional. Stress-test gardens are synthetic performance fixtures. Personal memories are entered by the visitor.

Personal gardens and photo blobs are kept locally. When optional provider tagging is enabled, memory text and known entity information are sent through the server endpoint for tagging. Photos and the full garden are not uploaded for that purpose. There is no account-based garden service or server-side garden database.

## Related approaches

Photo albums and timeline-based memory collections preserve and resurface records. Lethe mixes kinds of fragment and makes their shared relationships visible as a world the visitor can tend. Its fading flowers and returnable seeds make the passage of time part of that experience.

Spaced-repetition tools use forgetting models to schedule factual recall. Lethe uses an exponential model as a game mechanic for personal fragments, with connections and scarce light shaping what remains. It does not measure memory ability or schedule flashcard reviews.

## Open source credits

| Library or asset | Use | License |
|---|---|---|
| React and React DOM | Interface | MIT |
| Three.js and React Three Fiber | 3D rendering | MIT |
| drei and React Three Postprocessing | Camera controls and effects | MIT |
| postprocessing | Bloom and vignette | Zlib |
| Zustand | State coordination | MIT |
| Dexie | IndexedDB persistence | Apache 2.0 |
| Tone.js | Procedural audio | MIT |
| compromise | Local text tagging | MIT |
| Zod and Anthropic SDK | Validated optional provider tagging | MIT |
| Vite Vitest and tsx | Build and verification | MIT |
| TypeScript | Typed implementation | Apache 2.0 |
| Cormorant Garamond and Inter | Typography | SIL Open Font License |

Hosting uses Vercel. These dependencies and assets are credited separately from the project's authored code.

## Pre-existing work

All code, design and content were created during the competition.
