export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const APP_VERSION = "1.0.0";

export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "ru";

export const STORAGE_KEYS = {
  LANGUAGE: "@mamalog/language",
  AUTH_TOKEN: "@mamalog/auth_token",
  USER: "@mamalog/user",
  ONBOARDING_COMPLETE: "@mamalog/onboarding_complete",
  NOTIFICATIONS_ENABLED: "@mamalog/notifications_enabled",
} as const;
