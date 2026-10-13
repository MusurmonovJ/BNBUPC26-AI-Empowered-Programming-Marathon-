# Architecture

Lethe is a local-first web app. Everything lives in the browser, including tagging: an offline tagger finds people, places and feelings in each memory. If the server has a Groq or Anthropic key, a memory's text (and the names the garden already knows) also goes, briefly, to that provider for better tags. Diagrams are Mermaid: they render on GitHub, and in VS Code with the "Markdown Preview Mermaid Support" extension.

## 1. System overview

```mermaid
flowchart LR
  subgraph Browser
    direction TB
    UI["DOM interface<br/>src/ui · design-system CSS"]
    Offline["Offline tagger<br/>src/tagging/offline.ts · compromise"]
    Scene["3D garden<br/>src/scene · R3F + shaders"]
    Sound["Sound<br/>src/sound · Tone.js"]
    Store["Store<br/>src/store · Zustand"]
    Engine["Garden engine<br/>src/engine · pure TS, no rendering"]
    DB[("IndexedDB<br/>Dexie: garden + photo blobs")]
    UI <--> Store
    Scene <--> Store
    Sound --> Store
    Store --> Engine
    Store <--> DB
    Store --> Offline
  end
  subgraph Vercel
    Fn["/api/tag<br/>server/tag.ts"]
  end
  Provider[["optional provider<br/>Claude claude-haiku-5-5 if ANTHROPIC_API_KEY<br/>else Groq openai/gpt-oss-20b if GROQ_API_KEY<br/>else 503"]]
  Store -. "text + known entity names (background)" .-> Fn
  Fn --> Provider
  Fn -- "people · places · feelings (JSON)" --> Store
```

**Rule:** the engine never imports React, Three or the store. The store is the only thing that calls the engine. The scene and the UI read *views* (vitality, state) from the store and never compute retention themselves.

## 2. Module map

```mermaid
flowchart TB
  main["main.tsx"] --> App["App.tsx<br/>screen router + edge UI"]
  App --> screens["src/ui/screens/*<br/>Threshold · FirstPlantings · Return · Reveal · Settings"]
  App --> ds["src/ui/ds.tsx<br/>Button · LightCounter · Recollection · Overlay · PlantField · Whisper"]
  App --> GardenScene["src/scene/GardenScene.tsx"]
  GardenScene --> flower["src/scene/flower/*<br/>generator.ts → geometry.ts → Flower.tsx"]
  GardenScene --> thread["src/scene/thread/*<br/>ThreadArc + pulse shader"]
  GardenScene --> fog["src/scene/fog/*<br/>fog banks shader"]
  GardenScene --> fx["src/scene/fx/*<br/>Dissolve · BloomGrowth · Ripple"]
  GardenScene --> layout["src/scene/layout.ts · useLayout.ts"]
  screens --> store
  ds --> engine
  flower --> engine
  GardenScene --> store["src/store/garden.ts"]
  store --> engine["src/engine/*"]
  store --> tagging["src/tagging/tag.ts"]
  store --> persist["src/store/persist.ts (Dexie)"]
  tagging -. fetch .-> api["api/tag.ts → server/tag.ts"]
  sound["src/sound/*"] --> store
```

Files that exist today are the engine, data, store, tagging, `ui/ds.tsx`, `scene/GardenScene.tsx` (skeleton), `scene/layout.ts`, `server/tag.ts` and `api/tag.ts`. The rest are created by tasks in [build-plan.md](build-plan.md).

## 3. The core loop

```mermaid
flowchart LR
  P(["Plant"]) --> C(["Connect"])
  C --> F(["Fade"])
  F --> T(["Tend"])
  T --> R(["Reveal"])
  R -. next visit .-> P
  F -. "fog pulls down" .-> F
  T -. "light pushes up,<br/>spills along threads" .-> C
```

## 4. Memory states

```mermaid
stateDiagram-v2
  [*] --> vivid: plant (bloom 1.6s)
  vivid --> fading: vitality < 0.6
  fading --> ghost: vitality < 0.3
  ghost --> lost: vitality < 0.08 (dissolve 4.5s)
  fading --> vivid: tend, or a neighbour tended
  ghost --> vivid: tend
  ghost --> fading: neighbour tended / new thread
  vivid --> lost: let go (person's choice)
  fading --> lost: let go
  ghost --> lost: let go
  lost --> ghost: return (1 light)
  note right of lost
    words kept · dark seed stays
    threads to it fade out
  end note
```

State changes between visits ease over about 3s, "like dusk falling".

## 5. Data model

```mermaid
erDiagram
  GARDEN ||--o{ MEMORY : holds
  GARDEN ||--o{ ENTITY : knows
  GARDEN ||--o{ THREAD : draws
  MEMORY }o--o{ ENTITY : "people · places · feelings"
  THREAD }o--|| MEMORY : a
  THREAD }o--|| MEMORY : b
  MEMORY |o--o| PHOTO_BLOB : photoId
  GARDEN {
    number light
    number lightGrantedAt "real ms"
    number lastSeenAt "garden day"
    number lastSeenReal "real ms"
    string[] rejected "a|b thread keys"
  }
  MEMORY {
    string id
    string kind "sentence|photo|song|place"
    string text
    string hue "photo colour"
    number plantedAt "garden day"
    number lastTendedAt "garden day"
    number stability "S"
    bool lost
  }
  ENTITY {
    string id "person:grandma-mei"
    string kind "person|place|feeling"
    string name
    string[] aliases
  }
  THREAD {
    int level "0 = feeling only, 1-3 shared"
    string source "auto|manual"
  }
```

Vitality and state are **never stored**. They are derived from `lastTendedAt`, `stability` and the threads at a given `now` (`viewAll(garden, now)`). Layout positions are stored next to the garden once P10 lands.

## 6. Planting a memory

```mermaid
sequenceDiagram
  actor P as Person
  participant UI as PlantField / Plant overlay
  participant S as Store
  participant O as tagging/offline.ts
  participant T as tagging/tag.ts
  participant F as /api/tag
  participant C as Claude or Groq
  participant E as Engine
  participant G as Scene
  P->>UI: picks kind, types one line
  UI->>S: (debounced) preview tags
  S->>T: tag(garden, kind, text)
  T->>F: POST {kind, text, known entities} (skipped after 503, or during a 429 cooldown)
  F->>C: strict JSON schema (structured output)
  C-->>F: {people, places, feelings}
  F-->>T: JSON + x-lethe-tagger
  Note over T,O: 503 / 429 / error / slower than 4s → offline tags instead
  T-->>S: tags
  S->>E: suggestThreads(draft)
  S-->>G: dashed suggested threads
  P->>UI: removes a wrong tag (×), presses plant
  UI->>S: plantMemory()
  S->>O: offlineTag() (in the browser, no network)
  S->>E: plant() → rebuildThreads()
  S-->>G: event "bloom" → seed falls, roots, stem, petals (1.6s)
  S-)T: apiTag() in the background
  T--)S: better tags, if a provider answers in time
  S->>E: retag() → rebuildThreads()
  G-->>P: first thread lights up (chord)
```

## 7. Returning after time away

```mermaid
sequenceDiagram
  actor P as Person
  participant A as App
  participant S as Store
  participant E as Engine
  participant G as Scene
  P->>A: opens Lethe
  A->>S: load from IndexedDB
  S->>E: visit(garden, now, realNow)
  E->>E: grantLight() · advance(lastSeen → now, step 0.25d)
  E-->>S: ReturnSummary {faded, lost, aboutToBeLost, states before/after}
  S-->>G: replay: render "before" states, then ease each memory to "after" over ~3s with fog rolling in
  G-->>G: lost ones dissolve (4.5s); about-to-be-lost glow once
  S-->>A: Whisper "Four days passed. The library rooftop is about to be lost."
  P->>G: click the glowing ghost → tend (1 light)
```

## 8. Screen flow

```mermaid
flowchart TD
  start((open)) --> has{"garden in<br/>IndexedDB?"}
  has -- no --> T1["1 Threshold<br/>'Plant something you don't want to lose.'<br/>first click starts sound"]
  T1 --> T2["2 First plantings<br/>5–7 prompt cards"]
  T2 --> FF["fast-forward<br/>'a season passes'"]
  FF --> G3
  has -- yes --> R6["6 Return<br/>fog replay + whisper"]
  R6 --> G3["3 Garden"]
  G3 -- "N / + plant" --> P4["4 Plant overlay"]
  P4 --> G3
  G3 -- click flower --> M5["5 Memory focus<br/>tend · let go · return"]
  M5 --> G3
  G3 -- "what holds you" --> W7["7 Reveal"]
  W7 --> G3
  G3 -- "lethe (top-left)" --> S8["8 Settings<br/>sound · export · let the garden go"]
  S8 --> G3
  T1 -. "play a season" .-> E9["contest episode<br/>paused time · one light · one planting"]
  T1 -. "watch a season" .-> F10["three-minute film<br/>two genuine visits to the same life"]
  E9 -- "let a season pass" --> ER11["seasonal replay<br/>reflection · continue · play again"]
  ER11 --> E9
  F10 -- "stop watching" --> E9
```

The fictional episode never overwrites IndexedDB records belonging to a personal garden. Its film advances through store actions on the presentation clock; hidden-tab intervals pause playback. The original ten-memory reference garden remains at `?demo`.

## 9. Frame pipeline

```mermaid
flowchart LR
  clock["clock<br/>gardenNow() + slider"] --> views["viewAll()<br/>every 1s, or on action"]
  views --> uniforms["per-flower uniforms<br/>colour · glow · outline · droop"]
  uniforms --> r3f["R3F frame<br/>sway · breathe · motes"]
  r3f --> post["postprocessing<br/>Bloom → Vignette → Noise"]
  post --> canvas[canvas]
  views --> dom["DOM overlay<br/>Recollection projected to flower head"]
```

Views recompute on a 1s tick plus after each action, not every frame. Per-frame work is only animation (sway, breathing, pulses), driven by uniforms.
