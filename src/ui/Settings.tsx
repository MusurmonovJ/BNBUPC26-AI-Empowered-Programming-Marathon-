// Settings (screen p13), opened from "lethe" top-left: where the garden lives, take it with you, or let it go.
// Letting the garden go asks once more in plain words (D12), the one place the interface says "deletes".
// Sound on/off is here too, beside the same word bottom-right.

import { useEffect, useRef, useState } from 'react';
import { layoutOf } from '../data/placement';
import { useGarden } from '../store/garden';
import { exportFile } from '../store/persist';
import { Button, Overlay } from './ds';
import { SoundToggle } from './SoundToggle';
import { LanguageChoice, useLanguage } from './language';

/** "lethe", top-left: the name is the way into settings. */
export function SettingsEntry() {
  const open = useGarden((s) => s.settings);
  return (
    <button type="button" className="lt-btn is-text interface-sm settings-entry" aria-expanded={open}
      onClick={() => (open ? useGarden.getState().closeSettings() : useGarden.getState().openSettings())}>
      lethe
    </button>
  );
}

export function Settings() {
  const open = useGarden((s) => s.settings);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if (!open) setConfirming(false); }, [open]);
  if (!open) return null;
  return confirming ? <LetGo onKeep={() => setConfirming(false)} /> : <Main onLetGo={() => setConfirming(true)} />;
}

function Main({ onLetGo }: { onLetGo: () => void }) {
  const { t } = useLanguage();
  const first = useRef<HTMLButtonElement>(null);
  const [exporting, setExporting] = useState(false);
  useEffect(() => first.current?.focus(), []);
  const { closeSettings } = useGarden.getState();

  const exportGarden = async () => {
    setExporting(true);
    const { garden, positions, photos } = useGarden.getState();
    const { name, blob } = await exportFile(garden, layoutOf(Object.keys(garden.memories), positions), photos, Date.now());
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExporting(false);
  };

  return (
    <Overlay className="settings-overlay surface" title="Your garden" aria-label="your garden"
      actions={<Button onClick={closeSettings}>back to the garden</Button>}>
      <p className="interface settings-note">
        {t('Your memories stay in this browser. Connections are found here, on your device. If this garden has a tagging service, only a memory’s words are sent to it, and nothing is stored.')}
      </p>
      <div className="settings-choices">
        <SoundToggle ref={first} />
        <Button onClick={() => void exportGarden()} disabled={exporting}>export my garden</Button>
        <Button onClick={onLetGo}>let the garden go</Button>
      </div>
      <LanguageChoice />
    </Overlay>
  );
}

function LetGo({ onKeep }: { onKeep: () => void }) {
  const { t } = useLanguage();
  const keepIt = useRef<HTMLButtonElement>(null);
  // Focus lands on keeping it, so Enter never lets a garden go by accident.
  useEffect(() => keepIt.current?.focus(), []);
  return (
    <Overlay className="settings-overlay surface" title="Let the garden go?" aria-label="let the garden go"
      actions={<>
        <Button ref={keepIt} onClick={onKeep}>keep the garden</Button>
        <Button variant="pill" onClick={() => void useGarden.getState().letGardenGo()}>let the garden go</Button>
      </>}>
      <p className="interface settings-note">{t('This deletes every memory from this browser.')}</p>
    </Overlay>
  );
}
