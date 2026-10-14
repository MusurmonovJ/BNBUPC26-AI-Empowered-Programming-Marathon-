// "What holds your garden" (P9, screen p12): the people and places ranked by how much living memory they hold,
// each with a thin line of light as long as its share. Choosing one dims the garden to everything but what that
// person or place holds; their threads brighten and the held memories are named beside their flowers.
// Never numbers, percentages or a dashboard: words and light.

import { useMemo, useRef } from 'react';
import { holders, numberWord, type Memory } from '../engine';
import { useGarden, useRevealHeld } from '../store/garden';
import { Button } from './ds';
import { useFollow } from './useFollow';
import { useLanguage } from './language';
import { memoryTranslation } from './translations';

/** The few that hold the most; a reveal, not a ledger. */
const MAX_HOLDERS = 7;

export function RevealEntry() {
  const open = useGarden((s) => s.reveal.open);
  const any = useGarden((s) => Object.keys(s.garden.memories).length > 0);
  if (open || !any) return null;
  return <Button className="reveal-entry" onClick={() => useGarden.getState().openReveal()}>what holds you</Button>;
}

export function Reveal() {
  const { t } = useLanguage();
  const reveal = useGarden((s) => s.reveal);
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const now = useGarden((s) => s.now);
  const presented = useGarden((s) => !!s.presentation.holderId);
  const { selectHolder, closeReveal } = useGarden.getState();
  // Re-rank whenever vitality changes (views), not only when the garden does.
  const ranked = useMemo(() => holders(garden, now()).slice(0, MAX_HOLDERS), [garden, views, now]);

  if (!reveal.open) return presented ? <RevealLabels /> : null;
  const strongest = ranked[0]?.weight || 1;
  return (
    <>
      <nav className="reveal surface" aria-label={t('what holds your garden')}>
        <h2 className="title reveal-title">{t('What holds your garden')}</h2>
        {ranked.length === 0 && <p className="interface reveal-empty">{t('Nothing holds it yet. A memory with a person or a place in it would.')}</p>}
        <ul className="reveal-list">
          {ranked.map((h) => {
            const n = h.memories.length;
            return (
              <li key={h.entityId}>
                <button type="button" className={`reveal-holder${h.entityId === reveal.entityId ? ' is-on' : ''}`}
                  aria-pressed={h.entityId === reveal.entityId} onClick={() => selectHolder(h.entityId)}>
                  <span className="reveal-name">{t(h.name)}</span>
                  <span className="interface-sm reveal-count">{t(`${numberWord(n)} ${n === 1 ? 'memory' : 'memories'}`)}</span>
                  {/* How much it holds, as a line of light: no number, no percentage. */}
                  <span className="reveal-line" aria-hidden style={{ width: `${Math.max(8, (h.weight / strongest) * 100)}%` }} />
                </button>
              </li>
            );
          })}
        </ul>
        <Button className="reveal-back" onClick={closeReveal}>back to the garden</Button>
      </nav>
      <RevealLabels />
    </>
  );
}

/** A memory's words beside its flower in the reveal (p12): the first sentence, kept short. */
export function revealLabel(m: Memory): string {
  const first = m.text.split(/\.\s+(?=\p{Lu})/u)[0];
  if (first.length <= 48) return first.replace(/\.$/, '');
  const clause = first.slice(0, 48).lastIndexOf(',');
  if (clause > 12) return first.slice(0, clause);
  return `${first.slice(0, 46).replace(/\s+\S*$/, '')}…`;
}

function RevealLabels() {
  const { language } = useLanguage();
  const held = (useRevealHeld() ?? []).slice(0, 7);
  const garden = useGarden((s) => s.garden);
  const labels = useRef(new Map<string, HTMLSpanElement>());
  /** Labels already placed this frame, so the next one can keep clear of them. */
  const placed = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  /** Which spot each label took last frame: tried first, so labels hold still while the camera drifts. */
  const spot = useRef(new Map<string, number>());
  useFollow(held, (id, p) => {
    if (id === held[0]) placed.current = [];
    const el = labels.current.get(id);
    if (!el) return;
    if (!p || !p.onScreen) { el.style.visibility = 'hidden'; return; }
    // Beside the flower on its right, or on its left when the right edge is too close; never off screen.
    // When two flowers stand at about the same height, a later label tries the other side, then a line lower or
    // higher, so no two labels ever lie across each other.
    const w = el.offsetWidth, h = el.offsetHeight || 18, gap = p.r * 0.7 + 12, line = h + 6;
    const right = p.x + gap, left = p.x - gap - w;
    const sides = right + w <= innerWidth - 24 ? [right, Math.max(24, left)] : [Math.max(24, left), right];
    const spots = [0, line, -line, 2 * line, -2 * line].flatMap((dy) => sides.map((x) => ({ x, y: p.y - 9 + dy })));
    const free = (c: { x: number; y: number }) => c.x + w <= innerWidth - 8 && placed.current.every((q) =>
      c.x + w + 8 <= q.x || q.x + q.w + 8 <= c.x || c.y + h + 4 <= q.y || q.y + q.h + 4 <= c.y);
    const last = spot.current.get(id);
    const i = last !== undefined && spots[last] && free(spots[last]) ? last : Math.max(0, spots.findIndex(free));
    spot.current.set(id, i);
    const { x, y } = spots[i];
    placed.current.push({ x, y, w, h });
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    el.style.visibility = 'visible';
  });
  return (
    <div className="reveal-labels" aria-hidden>
      {held.map((id) => (
        <span key={id} className="interface-sm reveal-label surface" style={{ visibility: 'hidden' }}
          ref={(el) => { if (el) labels.current.set(id, el); else labels.current.delete(id); }}>
          {language === 'en' ? revealLabel(garden.memories[id]) : translatedRevealLabel(garden.memories[id])}
        </span>
      ))}
    </div>
  );
}

function translatedRevealLabel(m: Memory): string {
  const text = memoryTranslation(m.text);
  if (!text) return revealLabel(m);
  return text.length > 24 ? `${text.slice(0, 22)}…` : text.replace(/。$/, '');
}
