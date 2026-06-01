import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import vi from './vi';

export const initI18n = (lang: string) => {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        vi: { translation: vi },
      },
      lng: lang || 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // react escapes by default
      },
    });
};

export default i18n;
