// Planting a memory (screens p4–p6; design system PlantField and Overlay).
// "+ plant" (or N) → what kind of memory? → one line, with the threads it could join → plant: the flower grows
// where the seed was waiting. Tags come from the offline tagger at once, and from a provider if one answers.

import { useEffect, useRef, type CSSProperties } from 'react';
import type { Kind } from '../engine';
import { EPISODE_CHOICES, type EpisodeChoice } from '../data/episode';
import { useGarden } from '../store/garden';
import { Button, Overlay } from './ds';
import { useLanguage } from './language';
import { chineseName } from './translations';

const KINDS: Kind[] = ['sentence', 'photo', 'song', 'place'];
const KIND_HUE: Record<Kind, string> = { sentence: 'var(--sentence)', photo: 'var(--light)', song: 'var(--song)', place: 'var(--place)' };
/** Screen p5 for a sentence; the design system's PlantField placeholders for the rest. */
const PLACEHOLDER: Record<Kind, string> = {
  sentence: 'Something you don’t want to lose…',
  photo: 'what is in the photograph',
  song: 'a song, and where you heard it',
  place: 'a place, and who was there',
};
/** Tag after a pause in typing, not on every keystroke. */
const TAG_AFTER_MS = 600;

export function PlantButton() {
  const planting = useGarden((s) => s.planting);
  const canPlant = useGarden((s) => s.canPlantNow());
  if (planting !== 'closed') return null;
  return (
    <Button className="edge bottom-left plant-button" disabled={!canPlant} aria-keyshortcuts="n"
      onClick={() => useGarden.getState().openPlanting('kind')}>
      + plant
    </Button>
  );
}

export function PlantOverlay() {
  const planting = useGarden((s) => s.planting);
  if (planting === 'kind') return <KindStep />;
  if (planting === 'choices') return <EpisodeChoices />;
  if (planting === 'field') return <FieldStep />;
  return null;
}

function EpisodeChoices() {
  const { t } = useLanguage();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const s = useGarden.getState;
  return (
    <Overlay className="plant-overlay surface" title="a fragment of this life" aria-label="choose a memory"
      actions={<><Button onClick={() => { s().setDraftText(''); s().setDraftKind('sentence'); }}>write a memory</Button>
        <Button onClick={() => s().closePlanting()}>cancel</Button></>}>
      <div className="episode-choices">
        {(Object.keys(EPISODE_CHOICES) as EpisodeChoice[]).map((choice, i) => (
          <Button key={choice} ref={i === 0 ? first : undefined} onClick={() => s().selectEpisodeChoice(choice)}>
            {EPISODE_CHOICES[choice].text}
          </Button>
        ))}
      </div>
      <p className="interface-sm plant-note">{t('choose a fragment to see what it could join')}</p>
    </Overlay>
  );
}

function KindStep() {
  const { t } = useLanguage();
  const { setDraftKind, closePlanting } = useGarden.getState();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <Overlay className="plant-overlay surface" title="What kind of memory?" aria-label="what kind of memory"
      actions={<><span className="interface-sm plant-note">{t('each kind grows a different flower')}</span>
        <Button onClick={closePlanting}>cancel</Button></>}>
      <div className="kind-choices" role="radiogroup" aria-label={t('kind of memory')}>
        {KINDS.map((k, i) => (
          <button key={k} ref={i === 0 ? first : undefined} type="button" role="radio" aria-checked={false}
            className="kind-choice interface" onClick={() => setDraftKind(k)}>
            <span className="kind-seed" style={{ '--lt-hue': KIND_HUE[k] } as CSSProperties} aria-hidden />
            {t(k)}
          </button>
        ))}
      </div>
    </Overlay>
  );
}

function FieldStep() {
  const { t, language } = useLanguage();
  const draft = useGarden((s) => s.draft);
  const photoUrl = useGarden((s) => (s.draft?.photoId ? s.photos[s.draft.photoId]?.url : undefined));
  const { setDraftKind, setDraftText, setDraftPhoto, dropDraftTag, tagDraft, plantDraft, closePlanting } = useGarden.getState();
  const input = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), [draft?.kind]);
  // Tag after a pause in typing; the store aborts a stale provider request when a newer one starts.
  useEffect(() => {
    if (!draft || draft.choice) return;
    const t = setTimeout(() => void tagDraft(), TAG_AFTER_MS);
    return () => clearTimeout(t);
  }, [draft?.text, draft?.kind, draft?.choice]);

  if (!draft) return null;
  const chips = draft.tags ? [...draft.tags.people, ...draft.tags.places] : [];
  const needsPhoto = draft.kind === 'photo' && !draft.photoId;
  const ready = !!draft.text.trim() && !needsPhoto;
  const plant = () => { if (ready) void plantDraft(); };

  return (
    <Overlay className="plant-overlay surface" aria-label="plant a memory"
      actions={<><Button onClick={closePlanting}>cancel</Button><Button variant="pill" disabled={!ready} onClick={plant}>plant</Button></>}>
      {!draft.choice && <div className="lt-plant-kinds" role="radiogroup" aria-label={t('kind of memory')}>
        {KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={k === draft.kind}
            className={`lt-kind interface-sm${k === draft.kind ? ' is-on' : ''}`}
            style={{ '--lt-hue': k === 'photo' && draft.hue ? draft.hue : KIND_HUE[k] } as CSSProperties}
            onClick={() => setDraftKind(k)}>{t(k)}</button>
        ))}
      </div>}
      {draft.choice && <Button onClick={() => useGarden.getState().openPlanting('choices')}>choose another fragment</Button>}

      {draft.kind === 'photo' && (
        <div className="photo-pick">
          {photoUrl && <img src={photoUrl} alt="" className="photo-thumb" />}
          <Button onClick={() => file.current?.click()}>{photoUrl ? 'choose another photograph' : 'choose a photograph'}</Button>
          <input ref={file} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void setDraftPhoto(f); e.target.value = ''; }} />
        </div>
      )}

      {/* One memory, one line of thought (design system: "a sentence, not a journal entry"); it may wrap, as in p6. */}
      <textarea ref={input} className="memory-lg plant-input" rows={2} value={draft.choice ? t(draft.text) : draft.text} readOnly={!!draft.choice} maxLength={280} aria-label={t('the memory')}
        placeholder={t(PLACEHOLDER[draft.kind])} onChange={(e) => setDraftText(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); plant(); } }} />

      {chips.length > 0 && (
        <div className="plant-threads">
          <span className="interface-sm">{t('threads it could join')}</span>
          <div className="plant-chips">
            {chips.map((t) => (
              <span key={t.name} className="plant-chip interface">
                {language === 'en' ? t.name : chineseName(t.name)}
                {!draft.choice && <button type="button" className="plant-chip-x" aria-label={language === 'en' ? `not ${t.name}` : `不包含 ${chineseName(t.name)}`} onClick={() => dropDraftTag(t.name)}>×</button>}
              </span>
            ))}
          </div>
        </div>
      )}
    </Overlay>
  );
}
