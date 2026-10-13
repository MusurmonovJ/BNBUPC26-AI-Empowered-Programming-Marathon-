# Systems

The rules of the garden as the engine implements them. Every number lives in [src/engine/constants.ts](../src/engine/constants.ts); this page explains them. Tests in [src/engine/engine.test.ts](../src/engine/engine.test.ts) pin the behaviour.

## Forgetting

```
vitality  v = e^(−t / S_eff)        t = garden days since last tended
S_eff = S + CAP · (1 − e^(−bonus / CAP))     bonus = Σ 5 · weight(thread)  over threads to living memories
```

| constant | value | meaning |
|---|---|---|
| `S_INITIAL` | 7 | S at planting (garden days) |
| `TEND_STABILITY_MULT` | 1.8 | each tend multiplies S |
| `THREAD_STABILITY_BONUS` | 5 | days of S per unit thread weight, before saturation |
| `THREAD_BONUS_CAP` | 8 | most S that threads can add |
| `VIVID_AT / FADING_AT / GHOST_AT` | 0.6 / 0.3 / 0.08 | state thresholds |
| `ABOUT_TO_BE_LOST_BELOW` | 0.12 | ghosts this faint glow once on return |

What this means in real time (1 real day = 7 garden days):

| memory | lost after |
|---|---|
| alone, never tended | ~2.5 real days |
| one strong thread (S_eff ≈ 10.4) | ~3.7 real days |
| hub, many threads (S_eff → 15) | ~5.4 real days |
| tended once (S = 12.6, alone) | ~4.5 real days |
| tended twice + hub (S ≈ 22.7 + 8) | ~11 real days |

**Vitality is derived, never stored.** A new thread raises an old memory's S_eff at once, so its vitality jumps up. This is how "new threads can rescue fading ones" (plan § Return visits). A neighbour being lost lowers S_eff, so loss can cascade gently. Ease every visual change over about 3s so jumps never show.

## Threads

- Two memories that share a **person or place** get a thread. `level` = number shared (1–3).
- A shared **feeling** alone gives a faint thread (`level 0`, weight 0.3), so everything doesn't link through "joy".
- Weight: level 1 → 0.85, 2 → 0.95, 3 → 1.0, feeling-only → 0.3.
- **Brightness on screen** = weight × min(1, √(vA·vB) / 0.9). This reproduces the sample strengths: Mei 1–2 = 0.95, vivid–fading = ~0.6, fading–fading = ~0.43.
- The person can **reject** a suggested thread (it's never suggested again) or **draw** one by hand (`source: 'manual'`, level 1).
- Threads to lost memories disappear (`rebuildThreads`). Returning a memory re-forms them.
- **Entity matching.** A provider (Claude or Groq) gets the known entities and returns their ids when a new name matches. Whatever the source, the engine normalises names: lowercase, strips "my/our/the" and a possessive `'s`, keeps aliases, and maps relation words to one person (`src/engine/relations.ts`: "Mom", "mum", "my mother" → **Mom**; "my grandmother" → **Grandma**). A named relative ("Grandma Mei") stays a different person from an unnamed one ("Grandma").

## Tending and light

- `tend(id)`: −1 light, `t ← 0`, `S ← S × 1.8`, then each living neighbour gets back `30% × weight` of what it has lost (`v ← v + 0.3·w·(1−v)`).
- `returnTo(id)` on a lost memory: −1 light, returns as a ghost at v = 0.2 with S = 7, and its threads re-form.
- `letGo(id)`: free and immediate. The words are kept, so it can be returned to.
- Light: +3 per whole real day since the last grant, capped at 5. No streaks, no notifications.

## Time

- `gardenNow = lastSeenAt + gardenDaysForRealDays(realDaysSince) + debugOffset`.
- After 14 real days away, the extra time counts at 25%.
- `visit()` runs on every load: grant light → `advance()` in 0.25-day steps (so a loss weakens neighbours in order) → summary.
- **Hidden slider:** press <kbd>`</kbd>. Scrubbing previews the future without committing. **arrive** commits it as a real return visit, with its replay. Tending, planting, letting go or returning while the slider is moved first commits the preview the same way, so no action writes timestamps from a preview.

## Return summary → words

`ReturnSummary { gardenDaysPassed, realDaysPassed, faded[], lost[], aboutToBeLost[] }`, written as one whisper line ([decisions D11](decisions.md)):

1. `"{N} days passed."` Use real days, as a word: "Four days passed." Skip it if under 1 day.
2. If something is about to be lost: `"{name} is about to be lost."` Otherwise, if lost: `"{name} drifted into the fog."` Otherwise, if faded: `"{name} is drifting into fog."`
3. If the faded or about-to-be-lost memory has a holder: `"{holder} still holds it."`, or `"A faint thread to {holder} still holds it."` when that thread is under 0.3 (`holderOf` in `src/ui/whispers.ts`).

Never use counts, "you haven't…", warnings or exclamation marks. Names come from `firstWords(text, 4)` ("The library rooftop", "Gymnopédie No. 1").

## Reveal: "what holds you"

`holders(garden, now)` ranks people and places by Σ vitality of the living memories that mention them. Selecting one dims everything except those memories and the threads between them.

## Tagging

Every memory is tagged in the browser first, then optionally upgraded by a provider (decisions D13).

**Offline tagger** (`src/tagging/offline.ts`, the default):

| finds | how |
|---|---|
| names the garden already knows | word-boundary match on names and aliases, so their ids are reused |
| family and friends by relation | `RELATIONS`: "Mom", "Dad", "Grandma", "my sister", "my best friend" (and "Grandma Mei", "my sister Ana" as named people) |
| new people | compromise's people, plus capitalised mid-sentence names it doesn't know ("with Leo", "and Priya"), plus a sentence-initial name followed by "and me" or a past-tense verb ("Leo and me…") |
| places | compromise's places, a capitalised name after in/at/near/from/to/around, and everyday places (home, school, university, …) |
| feelings | `src/tagging/feelings.ts`: 129 words and phrases mapped to 11 feelings, at most two per memory |

Song memories skip their "title, artist." part, so the composer is never a person in the garden. compromise loads lazily (348 KB, about 143 KB gzipped), fetched as soon as the garden opens.

**Provider** (`server/tag.ts`, optional): Claude `claude-haiku-5-5` if `ANTHROPIC_API_KEY` is set, else Groq `openai/gpt-oss-20b` with a strict JSON schema if `GROQ_API_KEY` is set, else 503. Both answers are validated against the same zod schema.

`POST /api/tag` with `{ kind, text (≤400), known: [{id, kind, name}] }` returns `{ people: [{name, id|null}], places: [{name, id|null}], feelings: string[] }` and an `x-lethe-tagger: claude|groq` header.

| status | meaning | client does (`src/tagging/tag.ts`) |
|---|---|---|
| 200 | tags | replace the offline tags (`retag`) |
| 400 | bad body | keep offline tags |
| 429 | provider rate limit | keep offline tags; don't ask again for 3 minutes, or the `retry-after`, whichever is longer |
| 502 | provider error, or a reply in the wrong shape | keep offline tags; ask again next time |
| 503 | no key configured | keep offline tags; don't ask again this session |
| 504, or no reply in 4s | slow | keep offline tags; ask again next time |

## Sound (Tone.js), mapped to events

| event | sound |
|---|---|
| first click on threshold | start audio context; drone fades in over 4s; the music (D27) fades in over 8s from 2.5s |
| always, once started | **the music** (`src/sound/score.ts`): a waltz in C at 63 bpm, 3/4, one chord every 2 bars. Pad (fat triangle, attack 1.8s), a soft bass on each downbeat, and a melody (soft FM keys) that steps along the chord's notes, only ever C D E G A |
| fog share (fading+ghost / all) | drone filter cutoff falls and a second detuned voice rises in volume; the music's lowpass closes (2400 → 900 Hz), its melody thins (60% → 12% of beats), and from 0.35 the next round of chords turns from IV–I–vi–V (Fmaj7 Cmaj7 Am7 G6) to vi–IV–ii–iii (Am7 Fmaj7 Dm7 Em7) |
| hover flower | that flower's note as a small glass tone (FM, 0.9s), an octave above it faint: pentatonic (C D E G A), octave by kind (place low, sentence mid, song high, photo mid), note index = hash(id) % 5 |
| open a memory / back to the garden | its note and the fifth above, breathed in (attack 0.35s) / its note an octave down, quietly |
| plant opens | a breath of C and G |
| tend | soft chime on the flower's note, then each neighbour's note 120ms apart along threads |
| new thread | the two notes resolve into a chord (play together, 1.5s release) |
| lost | the note bends down a minor third over 2s and fades |
| a season passes (replay starts) | the fog's wind: pink noise through a band sinking 1100 → 260 Hz, swelling 2.5s, holding 3.5s, settling 5s; the music steps back to 35% and its melody waits until the replay ends |
| what holds you (reveal, or the film's held composition) | the holder's memories' notes, low to high, 0.16s apart |
| a title card in the film | a low breath of C3 G3 E4 |
| light gained | two glass notes, E6 then A6 |
| the film holds still (`presentation.quiet`) | drone to 45%, music to 35% |
| mute | visible `sound on/off` bottom-right; remembered |

## Tuning targets

Re-run `npm run sim -- daily|lazy|none` after any constant change. Current results (30 planned plantings, 9 real days):

| player | survivors | target |
|---|---|---|
| attentive (daily, spends all light) | 25/25 | almost everything, with fading visible |
| lazy (every 3rd day) | 14/16 | loses a few; the losses feel like choices |
| absent (never tends) | 11/25, avg 4.5 threads each | about half, and the survivors are the connected ones |

If the attentive player never sees a ghost, the garden is too easy. Lower `THREAD_BONUS_CAP`, or raise light scarcity.
