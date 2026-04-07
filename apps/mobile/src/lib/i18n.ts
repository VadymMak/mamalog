import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE } from "./constants";

const ru = {
  tabs: {
    diary: "Дневник",
    behavior: "Поведение",
    aiAdvisor: "AI советник",
    analytics: "Аналитика",
    library: "Библиотека",
  },
  sos: {
    title: "SOS",
    whatToDo: "Что делать сейчас",
    breathe: "Дыхание для мамы",
    audio: "Аудио для ребёнка",
  },
  auth: {
    login: "Войти",
    register: "Регистрация",
    email: "Email",
    password: "Пароль",
    name: "Имя",
  },
  common: {
    loading: "Загрузка...",
    error: "Ошибка",
    back: "Назад",
  },
};

const en = {
  tabs: {
    diary: "Diary",
    behavior: "Behavior",
    aiAdvisor: "AI Advisor",
    analytics: "Analytics",
    library: "Library",
  },
  sos: {
    title: "SOS",
    whatToDo: "What to do now",
    breathe: "Breathing for mom",
    audio: "Audio for child",
  },
  auth: {
    login: "Sign In",
    register: "Register",
    email: "Email",
    password: "Password",
    name: "Name",
  },
  common: {
    loading: "Loading...",
    error: "Error",
    back: "Back",
  },
};

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export type TranslationKeys = typeof ru;
