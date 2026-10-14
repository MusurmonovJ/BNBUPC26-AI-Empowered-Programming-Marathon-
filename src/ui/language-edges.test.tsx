import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SAMPLE, FIRST_PROMPTS } from '../data/sample';
import { EPISODE_CHOICES, EPISODE_MEMORIES, episodeGarden } from '../data/episode';
import { FILM_SECONDS, FILM_TITLES, STORY_LINES } from './story';
import { Button, Recollection } from './ds';
import { initialLanguage, LanguageProvider, LanguageText } from './language';
import { chinese, chineseName, displayCopy, memoryTranslation, parseLanguage, type Language } from './translations';

const render = (language: Language, children: React.ReactNode) => renderToStaticMarkup(<LanguageProvider initial={language}>{children}</LanguageProvider>);

describe('language presentation stays separate from the garden', () => {
  it('covers every original authored memory, fragment, film title, caption and first prompt', () => {
    for (const m of [...SAMPLE, ...EPISODE_MEMORIES, ...Object.values(EPISODE_CHOICES)]) {
      expect(memoryTranslation(m.text), m.id).toMatch(/\p{Script=Han}/u);
    }
    for (const text of [...Object.values(FILM_TITLES), ...Object.values(STORY_LINES), ...FIRST_PROMPTS.flatMap(p => [p.prompt, p.placeholder])]) {
      expect(chinese(text), text).not.toBe(text);
    }
  });
  it('preserves all original words and the 180-second timeline', () => {
    const { garden } = episodeGarden(12345);
    const before = JSON.stringify(garden);
    for (const m of Object.values(garden.memories)) {
      render('zh', <Recollection text={m.text} seed={m.id} state="ghost" />);
      render('bi', <Recollection text={m.text} seed={m.id} state="lost" />);
    }
    expect(JSON.stringify(garden)).toBe(before);
    expect(FILM_SECONDS).toBe(180);
  });
  it('keeps unknown personal text untouched in all languages', () => {
    const text = 'My own words 与我的回忆';
    for (const language of ['en', 'zh', 'bi'] as const) {
      expect(displayCopy(text, language)).toBe(text);
      expect(render(language, <Recollection text={text} seed="personal" state="vivid" />)).toContain(text);
    }
    expect(memoryTranslation(text)).toBeUndefined();
  });
  it('renders both languages for film prose and one selected language for actions', () => {
    const title = FILM_TITLES.kept;
    const bi = render('bi', <LanguageText text={title} />);
    expect(bi).toContain(title);
    expect(bi).toContain(chinese(title));
    expect(bi).toContain('lang="zh-Hans"');
    expect(render('zh', <LanguageText text={title} />)).not.toContain(title);
    expect(render('en', <LanguageText text={title} />)).toBe(title);
    expect(render('bi', <Button>tend</Button>)).toContain('照料');
    expect(render('en', <Button>tend</Button>)).toContain('>tend<');
  });
  it('Chinese ghost/lost memories retain the existing gaps instead of revealing a full translation', () => {
    const text = SAMPLE[1].text;
    const vivid = render('zh', <Recollection text={text} seed="m2" state="vivid" keywords={['Grandma Mei', 'Hangzhou']} />);
    const ghost = render('zh', <Recollection text={text} seed="m2" state="ghost" keywords={['Grandma Mei', 'Hangzhou']} />);
    const lost = render('zh', <Recollection text={text} seed="m2" state="lost" keywords={['Grandma Mei', 'Hangzhou']} />);
    expect(vivid).not.toContain('lt-gap');
    expect(ghost).toContain('lt-gap');
    expect(lost.match(/class="lt-gap"/g)!.length).toBeGreaterThanOrEqual(ghost.match(/class="lt-gap"/g)!.length);
    expect(ghost).toContain('word-leaving');
  });
  it('translates actual reflection actions, counters and state labels without inventing actions', () => {
    expect(chinese('you tended grandma mei’s words.')).toBe('你照料了梅奶奶的话。');
    expect(chinese('you returned to the library rooftop.')).toContain('重访');
    expect(chinese('the garden has changed. what remains still belongs to this life.')).not.toContain('照料');
    expect(chinese('1 of 5 light')).toBe('光 1 / 5');
    expect(chinese('13 memories')).toBe('13 段回忆');
    expect(chinese('no memories')).toBe('0 段回忆');
    expect(chinese('memory · ghost')).toBe('回忆 · 淡影');
  });
  it('accepts only the three supported language modes', () => {
    expect(parseLanguage('zh')).toBe('zh');
    expect(parseLanguage('bi')).toBe('bi');
    expect(parseLanguage('en')).toBe('en');
    expect(parseLanguage(null)).toBeNull();
    expect(parseLanguage('anything-else')).toBeNull();
  });
  it('uses explicit links before preferences and tolerates unavailable browser storage', () => {
    try {
      vi.stubGlobal('window', {});
      vi.stubGlobal('location', { search: '?demo=film&lang=bi' });
      vi.stubGlobal('localStorage', { getItem: () => 'zh' });
      expect(initialLanguage()).toBe('bi');
      vi.stubGlobal('location', { search: '?demo=play' });
      expect(initialLanguage()).toBe('zh');
      vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); } });
      expect(initialLanguage()).toBe('en');
    } finally { vi.unstubAllGlobals(); }
  });
  it('does not translate partial matches inside a personal name', () => {
    expect(chineseName('Leonie')).toBe('Leonie');
    expect(chinese('The library rooftop is drifting into fog. A faint thread to Satie still holds it.'))
      .toBe('图书馆屋顶正渐渐隐入雾中。 一条通向萨蒂的淡淡连接，仍支撑着它。');
  });
});
