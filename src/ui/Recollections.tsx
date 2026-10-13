// A memory's words surfacing in the garden (design system Recollection).
// Hover: beside its flower, space-3 from it, on the side with more open ground (screen p1).
// Focus: large, on the right half, while the camera brings the flower close on the left (screen p2).

import { useEffect, useRef } from 'react';
import { C, type Memory, type MemoryState } from '../engine';
import { useGarden } from '../store/garden';
import { Button, Recollection } from './ds';
import { useFollow } from './useFollow';

const SPACE_3 = 16;
const SPACE_4 = 24;

/**
 * What holds a memory up, said only while it is vivid: the people and places it shares with another living memory
 * (its threads), and its year. Once it fades it has begun to forget exactly these names (D22), so saying them here
 * would hand them back; its threads, lit on hover, still show what holds it, and the whisper names the holder.
 */
export function heldByNames(m: Memory, state: MemoryState): string[] {
  if (state !== 'vivid') return [];
  const { garden } = useGarden.getState();
  const others = Object.values(garden.memories).filter((o) => o.id !== m.id && !o.lost);
  const shared = (e: string) => others.some((o) => o.people.includes(e) || o.places.includes(e));
  return [...m.people, ...m.places].filter(shared).map((e) => garden.entities[e]?.name).filter((n): n is string => !!n)
    .concat(m.happenedAt ? [m.happenedAt] : []);
}

/** The memory's own specifics, the first words it forgets (D22): its people, its places, its year. */
export function keywordsOf(m: Memory): string[] {
  const { garden } = useGarden.getState();
  return [...m.people, ...m.places].map((e) => garden.entities[e]?.name).filter((n): n is string => !!n)
    .concat(m.happenedAt ? [m.happenedAt] : []);
}

export function HoverRecollection() {
  const hoveredId = useGarden((s) => s.hoveredId);
  const focusedId = useGarden((s) => s.focusedId);
  const revealing = useGarden((s) => s.reveal.open);
  const view = useGarden((s) => (hoveredId ? s.views[hoveredId] : null));
  const m = useGarden((s) => (hoveredId ? s.garden.memories[hoveredId] : null));
  const el = useRef<HTMLDivElement>(null);

  useFollow(m && !focusedId && !revealing ? m.id : null, (_, p) => {
    const box = el.current;
    if (!box) return;
    if (!p || !p.onScreen) { box.style.visibility = 'hidden'; return; }
    const w = box.offsetWidth, h = box.offsetHeight, W = innerWidth, H = innerHeight;
    // The side with more open ground: right of the flower unless it stands in the right part of the garden.
    const right = p.x + p.r + SPACE_3 + w < W - SPACE_4 && (p.x < W * 0.62 || p.x - p.r - SPACE_3 - w < SPACE_4);
    const left = right ? p.x + p.r + SPACE_3 : p.x - p.r - SPACE_3 - w;
    const top = Math.min(H - SPACE_4 - h, Math.max(SPACE_4, p.y - h / 2));
    box.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    box.style.visibility = 'visible';
  });

  if (!m || !view || focusedId || revealing) return null;
  return (
    <div ref={el} className="hover-recollection surface" style={{ visibility: 'hidden' }}>
      <Recollection text={m.text} seed={m.id} kind={m.kind} vitality={view.vitality} state={view.state}
        heldBy={heldByNames(m, view.state)} keywords={keywordsOf(m)} />
    </div>
  );
}

export function FocusRecollection() {
  const focusedId = useGarden((s) => s.focusedId);
  const view = useGarden((s) => (focusedId ? s.views[focusedId] : null));
  const light = useGarden((s) => s.garden.light);
  const m = useGarden((s) => (focusedId ? s.garden.memories[focusedId] : null));
  const episode = useGarden((s) => s.episode);
  const editable = !episode || episode.stage === 'exploring' || (episode.stage === 'finished' && episode.continued);
  const { tendMemory, letGoMemory, returnToMemory, focus } = useGarden.getState();
  const box = useRef<HTMLDivElement>(null);

  // Opened from the keyboard (a flower target had focus): move focus to the main action, so Enter tends.
  useEffect(() => {
    if (!focusedId) return;
    if (document.activeElement?.classList.contains('flower-target')) {
      requestAnimationFrame(() => box.current?.querySelector<HTMLButtonElement>('.lt-btn.is-pill:not(:disabled), .lt-btn:not(:disabled)')?.focus());
    }
  }, [focusedId]);

  if (!m || !view) return null;
  const back = <Button onClick={() => focus(null)}>back to the garden</Button>;
  return (
    <div ref={box} key={m.id} className="focus-recollection surface" role="dialog" aria-label={`memory · ${view.state}`}>
      <Recollection size="lg" text={m.text} seed={m.id} kind={m.kind} vitality={view.vitality} state={view.state}
        heldBy={heldByNames(m, view.state)} keywords={keywordsOf(m)}
        actions={view.state === 'lost'
          ? <><Button variant="pill" disabled={!editable || light < C.RETURN_COST} onClick={() => returnToMemory(m.id)}>return</Button>{back}</>
          : <><Button variant="pill" disabled={!editable || light < C.TEND_COST} onClick={() => tendMemory(m.id)}>tend</Button>
              <Button disabled={!editable} onClick={() => letGoMemory(m.id)}>let go</Button>{back}</>} />
      {episode?.stage === 'exploring' && !light && <p className="interface-sm plant-note">your light has found its place. a season can pass when you are ready.</p>}
    </div>
  );
}
