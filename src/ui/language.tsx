import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { chinese, displayCopy, parseLanguage, type Language } from './translations';

const STORAGE_KEY = 'lethe-language';
export function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const query = parseLanguage(new URLSearchParams(location.search).get('lang'));
  if (query) return query;
  try { return parseLanguage(localStorage.getItem(STORAGE_KEY)) ?? 'en'; } catch { return 'en'; }
}
const LanguageContext = createContext({ language: 'en' as Language, setLanguage: (_: Language) => {}, t: (text: string) => text });
export function LanguageProvider({ children, initial }: { children: ReactNode; initial?: Language }) {
  const [language, setLanguage] = useState(initial ?? initialLanguage);
  const chooseLanguage = (value: Language) => {
    setLanguage(value);
    const url = new URL(location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', value);
      history.replaceState(history.state, '', url);
    }
  };
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-Hans' : 'en';
    document.documentElement.dataset.language = language;
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Language works without storage. */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage: chooseLanguage, t: (text) => displayCopy(text, language) }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);

/** Bilingual text is reserved for prose, not every small action label. */
export function LanguageText({ text }: { text: string }) {
  const { language } = useLanguage();
  const zh = chinese(text);
  if (language === 'en' || zh === text) return <>{text}</>;
  if (language === 'zh') return <span lang="zh-Hans">{zh}</span>;
  return <><span lang="en">{text}</span><span className="language-translation" lang="zh-Hans">{zh}</span></>;
}
export function LanguageChoice({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  return <div className={`language-choice ${className}`} role="group" aria-label="language · 语言">
    {([['en', 'english'], ['zh', '中文'], ['bi', 'english + 中文']] as const).map(([value, label]) =>
      <button key={value} type="button" className="lt-btn is-text interface-sm" aria-pressed={language === value}
        lang={value === 'zh' ? 'zh-Hans' : 'en'} onClick={() => setLanguage(value)}>{label}</button>)}
  </div>;
}
