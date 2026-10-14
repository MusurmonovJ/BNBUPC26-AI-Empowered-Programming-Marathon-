// "watch a season" (D20): one quiet word beside "what holds you", only in the demo garden. While the story plays
// it reads "stop watching"; any click or key stops it too.

import { useGarden } from '../store/garden';
import { startStory, stopStory } from './story';
import { useLanguage } from './language';

export function StoryEntry() {
  const { t } = useLanguage();
  const running = useGarden((s) => s.story.running);
  const demo = useGarden((s) => s.owner === 'demo');
  if (!demo) return null;
  return (
    <button type="button" className="lt-btn is-text interface-sm story-entry" aria-pressed={running}
      onClick={() => (running ? stopStory() : startStory())}>
      {t(running ? 'stop watching' : 'watch a season')}
    </button>
  );
}
