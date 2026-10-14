// One whisper at a time, centred at the bottom (design system Whisper). After a return visit it tells what
// happened while the person was away; otherwise it names the faintest memory and what still holds it.
// It fades in, then out after 6s or on the next pointer movement.

import { useEffect, useState } from 'react';
import { useGarden } from '../store/garden';
import { Whisper } from './ds';
import { idleWhisper, returnWhisper } from './whispers';
import { LanguageText } from './language';

const SHOW_MS = 6000;
/** Ignore pointer movement for a moment, so the whisper can be read before a twitch of the mouse hides it. */
const ARM_MS = 1500;

export function GardenWhisper() {
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const summary = useGarden((s) => s.returnSummary);
  const override = useGarden((s) => s.whisperOverride);
  const phase = useGarden((s) => s.phase);
  const story = useGarden((s) => s.story);
  const presentation = useGarden((s) => s.presentation);
  const episode = useGarden((s) => s.episode);
  // While the story plays, its line comes first and nothing hides it: the story decides when it changes.
  const line = story.running ? story.line : presentation.line ?? override ?? (episode ? episode.stage === 'exploring'
    ? garden.light ? 'one light remains. tending a memory also reaches what is connected.' : 'your light has found its place. let a season pass when you are ready.'
    : episode.continued ? 'a little light for what you return to.' : null
    : ((summary && returnWhisper(garden, views, summary)) || idleWhisper(garden, views)));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (story.running || presentation.line) return;
    const hide = () => setVisible(false);
    const t = setTimeout(hide, SHOW_MS);
    const onMove = () => hide();
    const arm = setTimeout(() => addEventListener('pointermove', onMove, { once: true }), ARM_MS);
    return () => { clearTimeout(t); clearTimeout(arm); removeEventListener('pointermove', onMove); };
  }, [line, story.running, presentation.line]);

  if (!line || phase !== 'garden') return null;
  // The episode is shown to a room (D26): its lines are captions in the memory type, large enough to read from the
  // back of a hall, each fading in over the last. The film's are larger still.
  if (episode) {
    return (
      <p className={`lt-whisper ${story.running ? 'memory-lg' : 'memory'} episode-caption${visible ? '' : ' is-gone'}`} role="status">
        <span key={line} className="episode-caption-line"><LanguageText text={line} /></span>
      </p>
    );
  }
  return <Whisper className="edge bottom-center whisper" visible={visible}><LanguageText text={line} /></Whisper>;
}

/** The film's turning points: a title card in the empty sky above the garden (D26). */
export function FilmTitle() {
  const title = useGarden((s) => (s.story.running ? s.story.title ?? null : null));
  const phase = useGarden((s) => s.phase);
  if (!title || phase !== 'garden') return null;
  return <p className="title film-title" aria-live="polite"><span key={title} className="film-title-line"><LanguageText text={title} /></span></p>;
}
