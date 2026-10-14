// The first plantings (screens p8–p10): seven prompts, one card at a time, so threads exist on day one.
// Each planted memory grows below the card while the next prompt appears; skipping is always fine.
// After the last card the garden opens and a season passes (P8.3, in the store).

import { useEffect, useMemo, useRef, useState } from 'react';
import { FIRST_PROMPTS } from '../data/sample';
import { useGarden } from '../store/garden';
import { Button } from './ds';
import { useLanguage } from './language';

export function FirstPlantings() {
  const { t } = useLanguage();
  const phase = useGarden((s) => s.phase);
  const index = useGarden((s) => s.promptIndex);
  const { plantPrompt, skipPrompt } = useGarden.getState();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const prompt = FIRST_PROMPTS[index];
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  // A fresh card for each prompt.
  useEffect(() => { setText(''); setPhoto(null); input.current?.focus(); }, [index]);

  if (phase !== 'first' || !prompt) return null;
  const plant = () => { if (text.trim()) void plantPrompt(text, photo ?? undefined); };

  return (
    <section key={index} className="prompt-card lt-overlay surface" role="dialog" aria-label={t(prompt.prompt)}>
      <h2 className="prompt-title">{t(prompt.prompt)}</h2>
      {prompt.kind === 'photo' && (
        <div className="photo-pick">
          {photoUrl && <img src={photoUrl} alt="" className="photo-thumb" />}
          <Button onClick={() => file.current?.click()}>{photo ? 'choose another photograph' : 'choose a photograph'}</Button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { setPhoto(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        </div>
      )}
      <textarea ref={input} className="memory prompt-input" rows={1} value={text} maxLength={280} aria-label={t('the memory')}
        placeholder={t(prompt.placeholder)} onChange={(e) => setText(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); plant(); } }} />
      <div className="prompt-footer">
        {/* Where you are among the seven, as points of light, not a progress bar. */}
        <span className="prompt-dots" aria-label={t(`prompt ${index + 1} of ${FIRST_PROMPTS.length}`)}>
          {FIRST_PROMPTS.map((_, i) => <span key={i} className={`lt-light-dot${i < index ? ' is-lit' : ''}${i === index ? ' is-here' : ''}`} />)}
        </span>
        <Button onClick={skipPrompt}>skip</Button>
        <Button variant="pill" disabled={!text.trim()} onClick={plant}>plant</Button>
      </div>
    </section>
  );
}
