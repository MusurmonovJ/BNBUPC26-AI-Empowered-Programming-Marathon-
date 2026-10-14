// The threshold (screen p7): a dark garden and one line, before anything else. Clicking anywhere begins your own
// garden with the first plantings, or returns to the one this browser keeps; "see a garden" opens the demo garden of
// ten memories (for anyone just looking).
// This first click also starts sound (src/sound), as browsers require a gesture before audio.

import { useEffect, useRef, useState } from 'react';
import { useGarden } from '../store/garden';
import { Button } from './ds';
import { useMuted } from './SoundToggle';
import { startStory } from './story';
import { LanguageChoice, LanguageText, useLanguage } from './language';

/** The threshold fades away over this long once the person steps in. */
const LEAVE_MS = 1200;

export function Threshold() {
  const { t } = useLanguage();
  const phase = useGarden((s) => s.phase);
  const muted = useMuted();
  const [leaving, setLeaving] = useState<null | 'own' | 'demo' | 'story'>(null);
  const enter = useRef<HTMLButtonElement>(null);
  const filmLink = new URLSearchParams(location.search).get('demo') === 'film';
  // Back at the threshold after letting the garden go: step in afresh.
  useEffect(() => { if (phase === 'threshold') { setLeaving(null); enter.current?.focus(); } }, [phase]);

  useEffect(() => {
    if (!leaving) return;
    // The episode is prepared at the click, so as the threshold fades its seeds are already waiting in the dark; it is
    // then only opened, never replaced by a garden that vanishes and regrows.
    if (leaving !== 'own') useGarden.getState().beginEpisode(leaving === 'story' ? 'film' : 'play', LEAVE_MS);
    const t = setTimeout(() => {
      if (leaving === 'own') void useGarden.getState().enterOwn();
      else if (leaving === 'story') startStory({ prepared: true });
      else useGarden.getState().openEpisode();
    }, LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (phase !== 'threshold') return null;
  return (
    <div className={`threshold${leaving ? ' is-leaving' : ''}`}>
      {/* The whole screen is the way in. */}
      <button ref={enter} type="button" className="threshold-enter" aria-label={t("enter: plant something you don't want to lose")}
        onClick={() => setLeaving((l) => l ?? (filmLink ? 'story' : 'own'))}>
        <span className="threshold-seed" aria-hidden />
        <span className="title-lg threshold-line"><LanguageText text={filmLink ? 'A life becomes a garden.' : 'Plant something you don’t want to lose.'} /></span>
        <span className="interface-sm threshold-hint">{t(filmLink ? 'click to watch a season' : 'click anywhere to enter')}{muted ? '' : ` · ${t('sound on')}`}</span>
      </button>
      <div className="threshold-demo">
        <Button onClick={() => setLeaving((l) => l ?? 'demo')}>play a season</Button>
        <Button onClick={() => setLeaving((l) => l ?? 'story')}>watch a season</Button>
      </div>
      <LanguageChoice className="threshold-language" />
    </div>
  );
}
