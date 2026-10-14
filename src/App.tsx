// App shell: the 3D garden fills the screen; edge interface floats over it. The threshold and the first plantings
// come first (P8); "what holds you" opens the reveal (P9); "lethe" opens settings (P10).

import { useEffect, useState } from 'react';
import { C } from './engine';
import { GardenScene } from './scene/GardenScene';
import { useGarden } from './store/garden';
import { listenForFirstGesture } from './sound/sound';
import { preloadOfflineTagger } from './tagging/offline';
import { Button, LightCounter } from './ui/ds';
import { FirstPlantings } from './ui/FirstPlantings';
import { FlowerTargets } from './ui/FlowerTargets';
import { FilmTitle, GardenWhisper } from './ui/GardenWhisper';
import { PlantButton, PlantOverlay } from './ui/PlantOverlay';
import { FocusRecollection, HoverRecollection } from './ui/Recollections';
import { Reveal, RevealEntry } from './ui/Reveal';
import { Settings, SettingsEntry } from './ui/Settings';
import { StoryEntry } from './ui/StoryEntry';
import { SoundToggle } from './ui/SoundToggle';
import { TendMote } from './ui/TendMote';
import { Threshold } from './ui/Threshold';
import { useGardenKeys } from './ui/useGardenKeys';
import { EpisodeControls } from './ui/EpisodeControls';
import { LanguageProvider, useLanguage } from './ui/language';

export function App() {
  return <LanguageProvider><GardenApp /></LanguageProvider>;
}

function GardenApp() {
  // Fetch the offline tagger's NLP library in the background, so the first planting never waits for it.
  useEffect(preloadOfflineTagger, []);
  // Sound starts with the first click or key press (browsers need a gesture before audio).
  useEffect(listenForFirstGesture, []);
  useGardenKeys();
  const phase = useGarden((s) => s.phase);
  // Before the garden opens (threshold, first plantings), only the flowers and the card are on screen (p7–p10).
  const inGarden = phase === 'garden';
  const revealing = useGarden((s) => s.reveal.open);
  const settling = useGarden((s) => s.settings);
  return (
    <div className="stage">
      <GardenScene />
      <FlowerTargets />
      {inGarden && (
        <div className="edge top-left top-left-row">
          <SettingsEntry />
          <RevealEntry />
          <StoryEntry />
        </div>
      )}
      {inGarden && <Light />}
      {phase !== 'threshold' && <SoundToggle className="edge bottom-right sound-toggle" />}
      <HoverRecollection />
      <FocusRecollection />
      {inGarden && !revealing && !settling && <PlantButton />}
      <PlantOverlay />
      <GardenWhisper />
      <FilmTitle />
      {inGarden && <EpisodeControls />}
      <TendMote />
      {inGarden && <Reveal />}
      {inGarden && <Settings />}
      <FirstPlantings />
      <Threshold />
      {inGarden && <TimeSlider />}
    </div>
  );
}

function Light() {
  const light = useGarden((s) => s.garden.light);
  return <LightCounter className="edge top-right light-counter" value={light} max={C.LIGHT_MAX} showLabel />;
}

/**
 * Hidden time slider for testing and demos. Toggle with the ` key. Scrubbing previews the future; "arrive" commits it
 * as a return visit and plays the return replay; "reset demo garden" puts the ten sample memories back.
 */
function TimeSlider() {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const offset = useGarden((s) => s.clock.debugOffset);
  const episode = useGarden((s) => s.episode);
  const { setDebugOffset, arrive, resetDemo } = useGarden.getState();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === '`') setOpen((o) => !o); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!open || episode) return null;
  return (
    <div className="time-slider interface-sm">
      <label>
        {language === 'en' ? `+${offset.toFixed(1)} garden days (${(offset / C.GARDEN_DAYS_PER_REAL_DAY).toFixed(1)} real)`
          : `+${offset.toFixed(1)} 花园日（${(offset / C.GARDEN_DAYS_PER_REAL_DAY).toFixed(1)} 现实日）`}
        <input type="range" min={0} max={42} step={0.5} value={offset} onChange={(e) => setDebugOffset(Number(e.target.value))} />
      </label>
      <div className="time-slider-actions">
        <Button variant="pill" onClick={arrive}>{t('arrive')}</Button>
        <Button onClick={resetDemo}>{t('reset demo garden')}</Button>
      </div>
    </div>
  );
}
