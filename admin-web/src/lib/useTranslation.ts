"use client";

import { useState, useEffect } from 'react';
import { Language, translations, DEFAULT_LANG } from './i18n';

export function useTranslation() {
  const [lang, setLangState] = useState<Language>(DEFAULT_LANG);

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Language;
    if (saved === 'pt' || saved === 'es') {
      setLangState(saved);
    }
    
    // Listen for cross-component language changes
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail) {
        setLangState(customEvent.detail);
      }
    };
    
    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);

  const setLang = (newLang: Language) => {
    localStorage.setItem('app_lang', newLang);
    setLangState(newLang);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: newLang }));
  };

  const t = translations[lang];

  return { lang, setLang, t };
}
