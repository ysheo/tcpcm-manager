import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import { translations } from '../locales';

type Language = 'ko' | 'en';

// 타입 안전성을 위해 ko 데이터의 키를 추출
type TranslationKey = keyof typeof translations.ko;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, placeholder?: {[key:string]: string}) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('ko');

  const t = (key: TranslationKey, placeholder?: {[key:string]: string}) => {
    // 1. 해당 언어에서 키 찾기
    let text = translations[language][key];

    // 2. 만약 번역이 없으면(누락 시), 한국어(기본) 텍스트 사용 (Fallback)
    if (!text) {
      text = translations['ko'][key] || key;
    }

    // 3. 플레이스홀더 치환 ({name} -> 사용자명 등)
    if (placeholder && typeof text === 'string') {
      Object.keys(placeholder).forEach(phKey => {
        text = text.replace(`{${phKey}}`, placeholder[phKey]);
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};
