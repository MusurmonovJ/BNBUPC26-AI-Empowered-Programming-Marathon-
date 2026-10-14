// Typed ports of the design-system DOM components (lethe-design-system/components/bundle.js).
// Styling comes from the design system's bundle.css; markup and class names must stay identical.
// Bloom and Thread are NOT here: in Lethe they are 3D (src/scene).

import { useState, type FormEvent, type ReactNode } from 'react';
import { stateOf, type Kind, type MemoryState } from '../engine';
import { forgottenWords, splitWord } from './forgetWords';
import { useLanguage } from './language';
import { chinese, memoryTranslation } from './translations';

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

const KIND_HUE: Record<Kind, string> = { sentence: 'var(--sentence)', song: 'var(--song)', place: 'var(--place)', photo: 'var(--light)' };

/* ---------- Button ---------- */
export function Button({ variant, className, children, ...rest }:
  { variant?: 'pill' } & React.ComponentProps<'button'>) {
  const { t } = useLanguage();
  return (
    <button type="button" {...rest} aria-label={rest['aria-label'] ? t(rest['aria-label']) : undefined} className={cx('lt-btn', 'interface', variant === 'pill' ? 'is-pill' : 'is-text', className)}>
      {typeof children === 'string' ? t(children) : children}
    </button>
  );
}

/* ---------- LightCounter ---------- */
export function LightCounter({ value, max = 5, showLabel, className, style }:
  { value: number; max?: number; showLabel?: boolean; className?: string; style?: React.CSSProperties }) {
  const { t } = useLanguage();
  const val = Math.max(0, Math.min(max, value));
  return (
    <div className={cx('lt-light', className)} role="img" aria-label={t(`${val} of ${max} light`)} style={style}>
      <span className="lt-light-dots" aria-hidden>
        {Array.from({ length: max }, (_, i) => <span key={i} className={cx('lt-light-dot', i < val && 'is-lit')} />)}
      </span>
      {showLabel && <span className="interface-sm lt-light-label" aria-hidden>{t(`${val} of ${max} light`)}</span>}
    </div>
  );
}

/* ---------- Recollection ---------- */
/**
 * The memory's words, with what it has forgotten left as gaps. Which words go is Lethe's (D22, `forgetWords.ts`):
 * the specifics first, where the design system dropped words at random; the gap markup is the design system's.
 */
function memoryText(text: string, state: MemoryState, seed: string, keywords: string[] = [], zh = false): ReactNode[] {
  // Segment translated Chinese for the same existing word-loss renderer. English is untouched.
  const segments = (part: string) => zh ? Array.from(new Intl.Segmenter('zh-Hans', { granularity: 'word' }).segment(part), (s) => s.segment) : part.split(/(\s+)/);
  const lossText = zh ? segments(text).filter((s) => /[\p{L}\p{N}]/u.test(s)).join(' ') : text;
  const lossKeys = zh ? keywords.map((k) => segments(chinese(k)).join(' ')) : keywords;
  const forgotten = forgottenWords(lossText, state, seed, lossKeys);
  const parts = String(text).split(/(“[^”]*”|"[^"]*")/);
  let n = 0, gone = 0;
  return parts.map((part, pi) => {
    if (!part) return null;
    const speech = /^[“"]/.test(part);
    const words = segments(part).map((wd, wi) => {
      if (!wd || /^\s+$/.test(wd)) return wd;
      if (zh && !/[\p{L}\p{N}]/u.test(wd)) return wd;
      if (!forgotten.has(n++)) return wd;
      // A forgotten word leaves through its gap: it blurs, sinks and fades, one after another (D21). Its quote
      // marks and punctuation stay, so the sentence keeps its shape. The inner span is Lethe's only addition to
      // the design system's markup; the gap itself is unchanged.
      const [lead, core, trail] = splitWord(wd);
      return (
        <span key={wi}>{lead}<span className="lt-gap" style={{ width: `${Math.max(2, core.length * 0.45)}em` }}>
          <span className="word-leaving" aria-hidden style={{ animationDelay: `${600 + 180 * gone++}ms` }}>{core}</span>
        </span>{trail}</span>
      );
    });
    return speech ? <em key={pi} className="lt-speech">{words}</em> : <span key={pi}>{words}</span>;
  });
}

export function Recollection(props: {
  text: string; seed: string; kind?: Kind; planted?: string; vitality?: number; state?: MemoryState;
  heldBy?: string[]; actions?: ReactNode; size?: 'lg'; children?: ReactNode; className?: string; style?: React.CSSProperties;
  /** The memory's own people and places: the first words it forgets (D22). */
  keywords?: string[];
}) {
  const { language, t } = useLanguage();
  const state = props.state ?? stateOf(props.vitality ?? 1);
  const bits = [props.kind ? t(props.kind) : null, props.planted ? t(`planted ${props.planted}`) : null, t(state)].filter(Boolean);
  const translation = language === 'en' ? undefined : memoryTranslation(props.text);
  const primary = language === 'zh' && translation ? translation : props.text;
  const lg = props.size === 'lg';
  return (
    <figure className={cx('lt-recollection', lg && 'is-lg', `is-${state}`, props.className)} style={props.style}>
      {props.children && <div className="lt-recollection-media">{props.children}</div>}
      <blockquote className={lg ? 'memory-lg' : 'memory'}
        lang={primary === translation ? 'zh-Hans' : undefined}
        aria-label={forgottenWords(props.text, state, props.seed, props.keywords).size ? t('a memory with words missing') : undefined}>
        {memoryText(primary, state, props.seed, props.keywords, primary === translation)}
      </blockquote>
      {language === 'bi' && translation && <blockquote className={cx(lg ? 'memory-lg' : 'memory', 'memory-translation')} lang="zh-Hans">
        {memoryText(translation, state, props.seed, props.keywords, true)}
      </blockquote>}
      <figcaption className="interface-sm">{bits.join(' · ')}</figcaption>
      {props.heldBy && props.heldBy.length > 0 && <div className="interface-sm">{t(`held by ${props.heldBy.join(' · ')}`)}</div>}
      {props.actions && <div className="lt-recollection-actions">{props.actions}</div>}
    </figure>
  );
}

/* ---------- Overlay ---------- */
export function Overlay({ title, actions, width, children, className, style, ...rest }: {
  title?: string; actions?: ReactNode; width?: number | string; children?: ReactNode; className?: string; style?: React.CSSProperties;
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  const { t } = useLanguage();
  return (
    <section role="dialog" {...rest} aria-label={rest['aria-label'] ? t(rest['aria-label']) : title ? t(title) : undefined} className={cx('lt-overlay', className)} style={{ width, ...style }}>
      {title && <h2 className="title lt-overlay-title">{t(title)}</h2>}
      <div className="lt-overlay-body">{children}</div>
      {actions && <div className="lt-overlay-actions">{actions}</div>}
    </section>
  );
}

/* ---------- PlantField ---------- */
const KINDS: Kind[] = ['sentence', 'photo', 'song', 'place'];
const PLACEHOLDER: Record<Kind, string> = {
  sentence: 'a sentence you want to keep', photo: 'what is in the photograph',
  song: 'a song, and where you heard it', place: 'a place, and who was there',
};

export function PlantField(props: {
  onPlant?: (m: { kind: Kind; text: string }) => void; onKindChange?: (k: Kind) => void; onTextChange?: (t: string) => void;
  kind?: Kind; defaultKind?: Kind; placeholder?: string; disabled?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const { t } = useLanguage();
  const [kindS, setKindS] = useState<Kind>(props.defaultKind ?? 'sentence');
  const [val, setVal] = useState('');
  const kind = props.kind ?? kindS;
  const pick = (k: Kind) => { setKindS(k); props.onKindChange?.(k); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!val.trim() || props.disabled) return;
    props.onPlant?.({ kind, text: val.trim() });
    setVal(''); props.onTextChange?.('');
  };
  return (
    <form className={cx('lt-plant', props.className)} onSubmit={submit}
      style={{ ['--lt-hue' as string]: KIND_HUE[kind], ...props.style }}>
      <div className="lt-plant-kinds" role="radiogroup" aria-label={t('kind of memory')}>
        {KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={k === kind}
            className={cx('lt-kind', 'interface-sm', k === kind && 'is-on')}
            style={{ ['--lt-hue' as string]: KIND_HUE[k] }} onClick={() => pick(k)}>{t(k)}</button>
        ))}
      </div>
      <div className="lt-plant-row">
        <span className="lt-plant-seed" aria-hidden />
        <input className="memory lt-plant-input" value={val} maxLength={280} aria-label={t('the memory')}
          placeholder={t(props.placeholder ?? PLACEHOLDER[kind])}
          onChange={(e) => { setVal(e.target.value); props.onTextChange?.(e.target.value); }} />
        <Button type="submit" variant="pill" disabled={!val.trim() || props.disabled}>plant</Button>
      </div>
    </form>
  );
}

/* ---------- Whisper ---------- */
export function Whisper({ visible = true, children, className, style }:
  { visible?: boolean; children?: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <p className={cx('lt-whisper', 'interface', !visible && 'is-gone', className)} role="status" style={style}>{children}</p>;
}
