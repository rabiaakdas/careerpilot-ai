import { supportedLanguages, translations, type Language } from './translations'
import type { InterviewQuestionDifficulty } from '../types/interview'

export type ApplicationStatus =
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn'

type TranslationRoot = (typeof translations)['en']

export type TranslationKey = {
  [K in Extract<keyof TranslationRoot, string>]: TranslationRoot[K] extends string
    ? K
    : `${K}.${Extract<keyof TranslationRoot[K], string>}`
}[Extract<keyof TranslationRoot, string>]
export type TranslationValues = Record<string, string | number>
export type Translator = (
  key: TranslationKey,
  values?: TranslationValues,
) => string

const STORAGE_KEY = 'careerpilot.language'

export function getInitialLanguage(): Language {
  const storedLanguage = localStorage.getItem(STORAGE_KEY)

  if (isLanguage(storedLanguage)) {
    return storedLanguage
  }

  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

export function persistLanguage(language: Language) {
  localStorage.setItem(STORAGE_KEY, language)
  document.documentElement.lang = language
}

export function createTranslator(language: Language): Translator {
  return (key, values) => {
    const translatedValue = getTranslationValue(language, key)
    const fallbackValue = getTranslationValue('en', key)
    const template =
      typeof translatedValue === 'string'
        ? translatedValue
        : typeof fallbackValue === 'string'
          ? fallbackValue
          : key

    return formatTranslation(template, values)
  }
}

export function getLocale(language: Language) {
  return language === 'tr' ? 'tr-TR' : 'en-US'
}

export function getStatusLabel(status: ApplicationStatus, language: Language) {
  return translations[language].status[status] ?? translations.en.status[status]
}

export function getDifficultyLabel(
  difficulty: InterviewQuestionDifficulty,
  language: Language,
) {
  return (
    translations[language].difficulty[difficulty] ??
    translations.en.difficulty[difficulty]
  )
}

function isLanguage(value: string | null): value is Language {
  return supportedLanguages.includes(value as Language)
}

function getTranslationValue(language: Language, key: TranslationKey) {
  return key.split('.').reduce<unknown>((currentValue, segment) => {
    if (
      currentValue &&
      typeof currentValue === 'object' &&
      segment in currentValue
    ) {
      return (currentValue as Record<string, unknown>)[segment]
    }

    return undefined
  }, translations[language])
}

function formatTranslation(template: string, values?: TranslationValues) {
  if (!values) {
    return template
  }

  return Object.entries(values).reduce(
    (currentTemplate, [key, value]) =>
      currentTemplate.replaceAll(`{${key}}`, String(value)),
    template,
  )
}
