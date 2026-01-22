import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入模块化语言资源
import zhTranslations from '../locales/zh';
import enTranslations from '../locales/en';

const resources = {
  zh: zhTranslations,
  en: enTranslations,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 默认语言为中文
    fallbackLng: 'en', // 回退语言为英文
    debug: process.env.NODE_ENV === 'development',
    
    // 支持命名空间
    defaultNS: 'common',
    ns: ['common', 'auth', 'flow', 'modal', 'message', 'navigation', 'ui', 'validation', 'store', 'component', 'page'],
    
    interpolation: {
      escapeValue: false, // React已经处理了XSS
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
