"use client";

import { useTranslation } from "@/lib/useTranslation";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useTranslation();

  const toggleLang = () => {
    setLang(lang === 'pt' ? 'es' : 'pt');
  };

  return (
    <button
      onClick={toggleLang}
      title="Alternar Idioma / Cambiar Idioma"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/60 shadow-sm transition-all active:scale-95 ${className}`}
    >
      <span className="text-sm">{lang === 'pt' ? '🇧🇷' : '🇨🇱'}</span>
      <span className="uppercase tracking-wider font-semibold text-blue-400">{lang}</span>
    </button>
  );
}
