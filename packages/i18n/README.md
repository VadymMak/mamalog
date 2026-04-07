# @mamalog/i18n

Shared internationalisation package for all Mamalog apps.

## Stack

- **i18next** — core i18n engine
- **react-i18next** — React / React Native bindings

## AI language localisation

Claude API replies are localised by injecting the user's preferred language into the system prompt at runtime:

```
You are a helpful parenting assistant. Always reply in ${user.settings.language}.
```

The `SupportedLanguage` type (`"ru" | "en"`) from `@mamalog/types` is the source of truth for which languages are supported.

## Locales

| File | Language |
|------|----------|
| `src/locales/ru.json` | Russian (primary) |
| `src/locales/en.json` | English |

## Setup coming next

- i18next initialisation (separate configs for mobile and web)
- Language detection (device locale on mobile, `Accept-Language` header on web)
- Translation key conventions
