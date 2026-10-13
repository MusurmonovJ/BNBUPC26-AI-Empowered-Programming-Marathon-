# Contest kit

Everything for the audition: the 3-minute demo, setting up the machine, listening once, recording the 3-minute film, voicing it, and posting the listing. The demo is the **contest episode** (D24–D26): a fictional life of 23 memories, one remaining light, one planting, one season, then the same life again with a different choice. The product is frozen after its deploy (see the end); this file is the only thing that should still change.

**Links** (once the episode is deployed):
- **Play a season:** https://lethe-nine.vercel.app/?demo=play, the fictional garden, playable at once.
- **Watch a season:** https://lethe-nine.vercel.app/?demo=film, an opening screen ("A life becomes a garden."); one click plays the 3-minute film.
- **The front door:** https://lethe-nine.vercel.app/, with "play a season", "watch a season", or click anywhere to begin your own garden.
- The original ten-memory garden stays at `?demo` for reference.

## 0. The demo (3 minutes)

**The film is the demo** (owner, 13 Oct). One click plays three minutes in seven acts: what Lethe is, how a life holds together, a planting, the last light, a season, the same life with a different choice, and what remains. Both seasons are real engine actions: the film proves the choices matter by making two of them. Your job is one click, then stillness.

### Before you go on stage

1. Chrome on the NVIDIA GPU (§1), on mains power, notifications off, sound through the venue's speakers.
2. **Tab 1:** https://lethe-nine.vercel.app/?demo=film, full screen (<kbd>F11</kbd>), left on its opening screen. Rest the cursor in the empty sky, top right. Do not click yet.
3. **Tab 2:** https://lethe-nine.vercel.app/?demo=play, opened a minute early, for questions afterwards.
4. The recorded film open in a player, one click away, in case the site or the network fails.

### The script

The film carries its own words: three title cards open it, captions name each beat, and it ends on its name. **Never read the captions aloud**: the audience is reading them. If you have a few seconds before the clock starts, say one sentence over the opening screen, then click.

| film | on screen | you |
|---|---|---|
| before | "A life becomes a garden." | *This is a fictional life, written as a garden.* Click once, then **touch nothing**: any click, key or scroll stops the film. |
| 0:00 | "Everything we make today is made to be kept." · "But memory was never a vault." · "It is a garden." | silent |
| 0:14 | the fragments, Grandma Mei's words, Leo, the lone rooftop | optional voice in the gaps (§4) |
| 0:44 | the tea memory is planted and joins her | |
| 0:58 | the last light goes to Grandma Mei | |
| 1:16 | three weeks pass; the rooftop dissolves; "Nothing is erased. It only steps out of the light." | **silent** until the caption returns |
| 1:47 | "The same life. A different choice." The garden regrows; this time the rooftop is planted with Leo | |
| 2:17 | a second season; the rooftop stays, faint: "no light reached it. a thread did." | silent |
| 2:39 | "you cannot keep every moment in bloom." · "what you tend gives the garden its shape." · "Lethe — a garden that forgets." | silent, then: *The link plays this season, and lets you begin your own.* |

These outcomes are the engine's own (checked 13 Oct): with the tea planted and Grandma Mei tended, the rooftop is lost and her sentence keeps fading; with the rooftop fragment planted instead (Leo and me on the library rooftop), the same tend leaves her sentence fading **and** the rooftop as a ghost, held only by its new thread. Tending the rooftop itself keeps it as a ghost and leaves her sentence a ghost.

### If something goes wrong

- **The film stopped** (a stray click or key): carry on live in the same tab. The season is still yours to play: open the rooftop or Grandma Mei, **tend**, **let a season pass**.
- **Start again:** **play again** at the end of a season, or reload the tab and click "watch a season".
- **No sound:** carry on; it reads without sound. Say *"it has sound, too."*
- **The site or the network fails:** switch to the video.
- **"How long does a memory last?"** In a personal garden, one real day away is a week in the garden: a fresh memory nothing holds is lost after about two and a half days, threads stretch that to about five and a half, and every tend makes it last 1.8 times longer. The episode itself is a paused, fictional season. Numbers belong in answers, never on the screen.

## 1. Set up the machine (10 min, once)

1. **Run the browser on the NVIDIA GPU.** This laptop has an AMD Radeon 610M and an NVIDIA GeForce RTX 5060 Laptop GPU, and Windows has no GPU set for Chrome or Edge, so they run on the AMD chip. Every frame rate in `docs/build-plan.md` was measured on the AMD chip, and the RTX is far stronger. In Settings → System → Display → Graphics, add `C:\Program Files\Google\Chrome\Application\chrome.exe`, choose **High performance (NVIDIA)**, and restart Chrome. Check `chrome://gpu`: the renderer line should name the RTX 5060.
2. **Plug in power** and keep the **Performance** power plan (it is on now). On battery, the AMD chip throttles: one page swung from 64 to 11 fps within seconds.
3. **Open a clean 1440 × 900 window** with no tabs or address bar (<kbd>Win</kbd>+<kbd>R</kbd>, paste, Enter):
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=https://lethe-nine.vercel.app/?demo=film --window-size=1440,900 --user-data-dir=%TEMP%\lethe-rec
   ```
   The separate profile keeps extensions such as Grammarly out of the recording, and starts with no kept garden.
4. Close other apps, and turn notifications off (Focus assist).

**Measured on this laptop's AMD chip**, production build, DPR 1.5 (this screen is 2560 × 1600 at 150%): the demo garden averages 72–108 fps, but the slowest 5% of frames take 20–50 ms, which shows as rare small hitches. On the RTX those should disappear. If anything stutters in a take, add `&quality=low` to the link.

## 2. Listen once on real speakers (10 min)

Nobody has heard the garden on speakers yet; the levels were set by measurement only (`docs/build-plan.md` P11.3). The film plays every sound in order, so open `?demo=film`, click once, and listen for:

| film time | moment | listen for |
|---|---|---|
| 0–6s and 1:47–1:53 | the garden growing in (twice) | a soft note as each seed lands, a gentle cascade, never a clatter |
| from 0:03, throughout | the music | a slow waltz, warm and a little sad; under every event, never over it. It darkens after the first season and brightens again when the garden regrows |
| 0:00, 1:32, 1:47, 2:52 | the title cards | a low breath under each card |
| 0:20, 0:27, 0:33 | opening a memory | its note breathed in, soft |
| throughout | the drone | low and warm, never a hum you notice after 20s (on laptop speakers you will hardly hear it) |
| 0:51 and 2:01 | a planted memory's first threads | two to four notes together as the threads light, 1.5s tail |
| 1:01 and 2:10 | the tend | the one bright sound, a bell, then the neighbours answering, quieter |
| 1:19 and 2:17 | a season passing | a wind of fog swelling and settling over about 11s, the music stepping back |
| 1:20–1:26 and 2:18–2:24 | losses | notes bending down a minor third and fading; never a pile-up |
| 1:39 and 2:39 | what holds this life | a handful of glass notes rising |
| 1:26–1:31 | the quiet hold | the drone drops to about half, then returns for the wide view |

If anything is harsh, too loud, too long or too dull, describe it in words ("the bell is too sharp", "the music is too busy") and it gets fixed with numbers in `src/sound/sound.ts` and `src/sound/score.ts`. Hover a few flowers in `?demo=play` too: each has its own glass note, always in tune with the music. Record with sound on: silent garden videos lose half the atmosphere.

## 3. Record the film (3 min)

**Tool:** Windows Game Bar records the active window with its sound, no install needed: <kbd>Win</kbd>+<kbd>Alt</kbd>+<kbd>R</kbd> to start and stop. In Settings → Gaming → Captures, choose 60 fps and the highest audio quality, and keep the microphone off (the voice, if any, goes on afterwards). Make a 10-second test clip first and check it plays back with sound.

**The film** is the garden's own: nothing to steer, so the take is about stillness.
1. Open the clean window from §1 (it opens `?demo=film`). Rest the cursor in the empty sky, top right.
2. Start recording, click once where the cursor rests, then **touch nothing**: any click, key or scroll stops the film. Hiding the window pauses it rather than skipping beats.
3. Let the film finish before stopping. The title "Lethe — a garden that forgets." appears near the end; the film holds it, then finishes around 3:01 after the click once the scene is ready. If the submission limit is exactly three minutes, trim the initial threshold and loading frames so the video begins with the first film title and retains the complete ending. Avoid extra narration before or after that cut.

| film time | act | beat | words |
|---|---|---|---|
| 0:00–0:14 | prologue | the seeds fall and the garden grows in | *title cards:* Everything we make today is made to be kept. · But memory was never a vault. · It is a garden. |
| 0:14–0:44 | fragments | the whole garden; Grandma Mei's sentence read in full, its threads lit; Leo's night bus; the library rooftop, alone | every flower is a fragment of a life: words, songs, places, photographs. · memories that share someone or somewhere hold each other up. · a night bus with leo, held by every other memory of him. · the library rooftop. a place remembered on its own. · what nothing else shares has nothing to lean on. |
| 0:44–0:58 | growing | the tea fragment shows the threads it could join, is planted, grows and joins her | a new memory finds what it shares. · it grows into what holds it. |
| 0:58–1:16 | choosing | the last light is spent on Grandma Mei; the ripple runs to her memories | one light remains. to tend one memory is to choose it. · its light reaches everything her words are part of. · the rest is left to the season. |
| 1:16–1:47 | a season | three weeks pass; the camera stays on the rooftop while it dissolves, holds on its seed in silence, then rises to the changed garden; Grandma Mei's memories gently lit and named | three weeks pass in this garden. · *title:* Nothing is erased. It only steps out of the light. · what was held together still glows. |
| 1:47–2:17 | another choice | the same life regrows from its seeds; the rooftop fragment is planted and threads to the rooftop and to Leo; the light still goes to Grandma Mei | *title:* The same life. A different choice. · this time, the rooftop is remembered with leo. · a thread reaches the rooftop. · the light still goes to grandma mei. · three weeks pass again. |
| 2:17–2:39 | the second season | the camera stays on the rooftop: it fades, its words thin out, but it stays | the rooftop is still here, faint. · no light reached it. a thread did. |
| 2:39–3:00 | coda | rise to the garden; the group that holds the most gently lit | you cannot keep every moment in bloom. · what you tend gives the garden its shape. · *title:* Lethe — a garden that forgets. |

## 4. Voiceover (optional, about 45 words)

The film reads on its own; a voice is a bonus for the recording. Speak only where no caption is showing, and leave both seasons' passing and the coda silent.

> **[before the click, over the opening screen]** This is a fictional life, written as a garden.
>
> **[0:41, after "what nothing else shares…"]** Nothing else remembers the rooftop.
>
> **[1:16–1:47]** *(silence: the season passes, the rooftop dissolves)*
>
> **[1:45, before the garden regrows]** Let's live it again.
>
> **[2:17–2:39]** *(silence: the second season)*
>
> **[after the film]** The link plays this season, and lets you begin your own.

## 5. The listing

**Stills** (listings are voted on thumbnails before anyone clicks), from the current episode:
- **Final composition** (recommended thumbnail): `docs/look-log/20261013-1249-listing-still-final-16x9.png` (1920 × 1080) and `…-final.png` (2880 × 1800).
- **Opening garden:** `docs/look-log/20261013-1249-listing-still-opening-16x9.png` and `…-opening.png`.
- **From the film** (1440 × 900): the prologue over the falling seeds `docs/look-log/20261013-1417-film3-prologue.png`, the title card over the changed garden `…-film3-erased.png`, the rooftop half-forgotten `…-film3-rooftop-faint.png`.

**Title:** Lethe — a garden that forgets

**Description:**

> Lethe turns fragments of a life into a living garden. Plant memories, discover their connections, and choose what to tend. As seasons pass, some moments fade—and the garden reveals what holds a life together.

**Links:**
- Play a season: https://lethe-nine.vercel.app/?demo=play
- Watch a season (3 min): https://lethe-nine.vercel.app/?demo=film
- Voting link: *(add it here when the contest publishes it)*

**Try this:**
- Hover a flower to read it; its threads light. Click it to open it.
- One light remains: **tend** a memory, and see which connected memories it reaches.
- **+ plant** (or <kbd>N</kbd>): choose one of two fragments of this life, or write your own.
- **let a season pass** (bottom): three weeks go by, and the garden shows what your choice kept.
- Then **continue tending**, **play again** with a different choice, or **begin your own** garden.
- Drag to turn, right-drag (or two fingers) to move, scroll to come close or rise above; <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>/arrows glide, <kbd>Q</kbd>/<kbd>E</kbd> turn, <kbd>Esc</kbd> closes or stops.

**Notes:** The example life is fictional. A garden you begin yourself stays in your browser only. Sound starts on your first click (headphones help). Desktop Chrome or Edge, a window 1440 × 900 or larger.

## 6. Fallbacks

- **The live site fails mid-judging:** link the recorded video file next to the site link in the listing (upload the Game Bar MP4 to the listing, or to a video host).
- **Browsers checked** (13 Oct, no console errors): the playable season and the film in Chrome and Edge on Windows, muted too, and the whole season by keyboard alone. The episode never calls the network, so it plays offline once loaded. **Not checked: Safari and Firefox.** Safari is the risky one: it is strict about starting audio, so the garden may stay silent there. If the listing asks, say "best in Chrome or Edge".
- **Tagging service down:** planting still works; the offline tagger in the browser finds the threads (checked with no key on a preview deploy).

## 7. Freeze

After the episode's deploy, nothing merges except a fix for a red tree or a broken demo path. No new effects, no look tuning, no geometry merging. Look frozen 13 Oct (`docs/look-log/20261013-1100-look-freeze-garden.png`); the episode's approved frames are `docs/look-log/20261013-1249-episode-*.png`, the 3-minute film's `docs/look-log/20261013-1417-*.png`.
