import { useLanguageContext } from "../context/LanguageContext";
import { get } from "../lib/storage";
import { STORAGE_KEYS, DEFAULT_LANGUAGE, type SupportedLanguage } from "../lib/constants";

export function useLanguage() {
  return useLanguageContext();
}

export async function getStoredLanguage(): Promise<SupportedLanguage> {
  const saved = await get<SupportedLanguage>(STORAGE_KEYS.LANGUAGE);
  return saved ?? DEFAULT_LANGUAGE;
}
