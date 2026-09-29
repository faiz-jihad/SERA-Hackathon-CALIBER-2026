import React, { createContext, useContext, useState, useEffect } from 'react'
import { en } from '../i18n/en'
import { id } from '../i18n/id'

export type Language = 'en' | 'id'

type TranslationKeys = keyof typeof en

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKeys | string, defaultVal?: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en,
  id,
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'sera_language_pref'

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'id') {
      return saved
    }
    return 'en'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = (key: TranslationKeys | string, defaultVal?: string): string => {
    const dict = translations[language] || translations.en
    if (dict && dict[key] !== undefined) {
      return dict[key]
    }
    const enDict = translations.en
    if (enDict && enDict[key] !== undefined) {
      return enDict[key]
    }
    return defaultVal || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
