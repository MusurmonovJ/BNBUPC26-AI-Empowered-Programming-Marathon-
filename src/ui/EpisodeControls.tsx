import { useGarden } from '../store/garden';
import { Button } from './ds';
import { useLanguage } from './language';

export function EpisodeControls() {
  const { t } = useLanguage();
  const episode = useGarden((s) => s.episode);
  const hidden = useGarden((s) => s.story.running || s.planting !== 'closed' || s.settings || !!s.focusedId || s.reveal.open);
  const pending = useGarden((s) => s.plantingPending);
  if (!episode) return null;
  const s = useGarden.getState;
  return <>
    <span className="interface-sm episode-attribution">{t('a fictional example life')}</span>
    {!hidden && <div className="episode-actions">
      {/* Quiet, like every other word in the garden: the season is the visitor's to choose, never urged. */}
      {episode.stage === 'exploring' && <Button disabled={pending} onClick={() => s().advanceEpisode()}>let a season pass</Button>}
      {episode.stage === 'passing' && <span className="interface-sm">{t('a season passes')}</span>}
      {episode.stage === 'finished' && <>
        {!episode.continued && <Button variant="pill" onClick={() => s().continueEpisode()}>continue tending</Button>}
        <Button onClick={() => s().restartEpisode()}>play again</Button>
        <Button onClick={() => void s().enterOwn()}>begin your own</Button>
      </>}
    </div>}
  </>;
}
