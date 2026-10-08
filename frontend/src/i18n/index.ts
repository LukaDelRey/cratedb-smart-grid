import { computed, ref, watchEffect } from 'vue';
import en from './en';
import hr from './hr';

const STORAGE_KEY = 'crate-dashboard-language';

type LanguageCode = 'en' | 'hr';

interface TranslationTree {
  [key: string]: string | TranslationTree;
}

type TranslationParams = Record<string, string | number>;

export const languageOptions = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'hr', label: 'Hrvatski', shortLabel: 'HR' },
] as const;

const supportedLanguages = new Set(languageOptions.map((option) => option.code));

const savedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;

export const currentLanguage = ref(
  supportedLanguages.has(savedLanguage as LanguageCode) ? (savedLanguage as LanguageCode) : 'en',
);

export const translations: Record<LanguageCode, TranslationTree> = {
  en: en,
  hr: hr,
};

export default translations;

function createValuePathMap(messages: TranslationTree, prefix = ''): Record<string, string> {
  return Object.entries(messages).reduce(
    (paths, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object') {
        return {
          ...paths,
          ...createValuePathMap(value, path),
        };
      }

      if (typeof value === 'string') {
        paths[value] = path;
      }

      return paths;
    },
    {} as Record<string, string>,
  );
}

const englishValuePaths = createValuePathMap(translations.en);

function resolveMessage(
  messages: TranslationTree,
  key: string,
): string | TranslationTree | undefined {
  if (Object.prototype.hasOwnProperty.call(messages, key)) {
    return messages[key];
  }

  return key
    .split('.')
    .reduce(
      (current, segment) => (current && typeof current === 'object' ? current[segment] : undefined),
      messages,
    );
}

export function setLanguage(code: string) {
  currentLanguage.value = supportedLanguages.has(code as LanguageCode)
    ? (code as LanguageCode)
    : 'en';
}

export function t(key: string, params: TranslationParams = {}) {
  const activeMessages = translations[currentLanguage.value] || translations.en;

  const fallbackMessages = translations.en;

  const normalizedKey = englishValuePaths[key] || key;

  const message =
    resolveMessage(activeMessages, normalizedKey) ??
    resolveMessage(fallbackMessages, normalizedKey) ??
    key;

  const text = typeof message === 'string' ? message : key;

  return Object.entries(params).reduce(
    (result, [name, value]) => result.replaceAll('{' + name + '}', String(value)),
    text,
  );
}

export function translateText<T>(value: T) {
  if (value === null || value === undefined) {
    return value;
  }

  return t(String(value));
}

export function translateStatus<T>(value: T) {
  return translateText(value);
}

export function useI18n() {
  const language = currentLanguage;

  const currentLanguageOption = computed(
    () => languageOptions.find((option) => option.code === language.value) || languageOptions[0],
  );

  return {
    language,
    languageOptions,
    currentLanguageOption,
    setLanguage,
    t,
    translateText,
    translateStatus,
  };
}

watchEffect(() => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, currentLanguage.value);
  document.documentElement.lang = currentLanguage.value === 'hr' ? 'hr' : 'en';
});
