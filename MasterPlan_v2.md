# MAMALOG — Master Plan v2.0 | Апрель 2026

_Обновлено: 08.04.2026_

---

## СТАТУС ПРОЕКТА

### ✅ СДЕЛАНО (Фаза 1–2)

**Мобильное приложение (React Native + Expo SDK 52)**
- Онбординг (4 слайда)
- Регистрация + Логин с JWT
- Дневник дня (записи, настроение, эмоции, триггеры)
- Экран поведения (категории, интенсивность)
- AI Советник (OpenAI бесплатно / Claude платно)
- Аналитика с графиками
- Библиотека статей + KnowledgeArticle тип + FALLBACK_ARTICLES (никогда пустой экран)
- Фильтрация статей по категориям (ScrollView chips)
- TrustStars компонент (★★★★☆)
- SOS экран с дыхательными упражнениями
- Профиль пользователя
- Push уведомления (базово)
- APK сборка через EAS

**Backend (Next.js на Vercel)**
- 20+ API endpoints
- NextAuth + Bearer token авторизация (явный SELECT — безопасен при отставании схемы)
- Neon PostgreSQL + Prisma ORM
- **Hybrid RAG**: vectorSearch + keywordSearch + diaryContext → `buildKnowledgeContext` (~800 токенов)
- pgvector эмбеддинги в KnowledgeBase (cosine distance + trustIndex сортировка)
- **Dual AI**: OpenAI GPT-4o-mini (free, 3/день) / Claude claude-sonnet-4-6 (premium, безлимит)
- **Superuser аккаунты**: `isSuperUser` флаг, безлимитный AI без подписки
- **AIUsageLog**: таблица для rate limiting free tier
- Knowledge base CRUD API: `GET/POST /api/knowledge`, `PATCH/DELETE /api/knowledge/[id]`
- Admin user detail: `GET /api/admin/users/[id]`
- Superuser toggle: `POST /api/admin/users/[id]/superuser`
- Zero-downtime миграции: `apps/web/scripts/migrate.js` запускается на каждый Vercel build

**Десктопная админка (Electron + React)**
- Dashboard со статистикой
- Управление специалистами (одобрить/отклонить)
- **CRM**: таблица пользователей, поиск, фильтры (Free/Premium/Superuser/Новые), superuser toggle
- **UserDetail**: полный профиль — дневники, поведение, подписка, последняя активность
- **Analytics**: SVG LineChart (DAU + новые пользователи), воронка MiniBar, MRR/ARR оценка
- **KnowledgeBase**: таблица статей, ArticleForm (автор/тип/теги/доверие/возраст), одобрение/отклонение

---

### ❌ ОСТАЛОСЬ (Фаза 3–4)

**Монетизация** ← _приоритет №1_
- RevenueCat подписки ($4.99/мес, $34.99/год)
- 7-дневный пробный период
- Paywall экраны в мобильном
- История платежей в CRM

**Мобильные доработки**
- ArticleDetailScreen — переключить с локального ARTICLES на `/api/knowledge/[id]`
- Закладки (Bookmark) — персистентность через DB (сейчас только local state)
- Профиль специалиста — экран-детали (карточки есть, `onPress={() => {}}` — заглушка)
- Re-enable `isSuperUser` в SELECT запросах — после первого Vercel deploy (migrate.js отработает)

**Community Feed (Фаза 3)**
- Посты мам (вопрос/опыт/победа)
- AI фильтр от спама и рекламы
- Лайки и комментарии
- Репутационная система
- Фильтры по диагнозу и возрасту
- Интеграция опыта мам в RAG базу знаний

**CRM расширение (Фаза 3)**
- Сегментация пользователей и теги
- Email рассылки (шаблоны + история)
- Аналитика конверсии воронки

**RAG расширение**
- Источники в ответах AI (ссылка на статью)
- Публикации специалистов через мобильный
- Опыт мам из Community Feed

**Публикация**
- Google Play Store
- Apple App Store (iOS версия)

---

## 📋 ПЛАН ИТЕРАЦИЙ

**Итерация 2 (следующая)** ← _текущий приоритет_
- RevenueCat интеграция (paywall + webhooks)
- ArticleDetailScreen → реальный API
- Bookmark persistence → DB

**Итерация 3**
- Community Feed MVP
- AI модерация постов
- RAG расширение (специалисты + мамы)

**Итерация 4**
- Google Play публикация
- iOS адаптация
- A/B тестирование онбординга

---

## ТЕХНИЧЕСКИЙ СТЕК (финальный)

| Слой | Технология |
|------|-----------|
| Mobile | React Native + Expo SDK 52 (New Architecture) |
| Navigation | React Navigation v7 (stack + bottom tabs) |
| Backend | Next.js 16 на Vercel |
| DB | Neon PostgreSQL + Prisma 6 + pgvector |
| Auth | NextAuth v4 + Bearer token + bcryptjs |
| AI Free | OpenAI GPT-4o-mini (3 msg/day, AIUsageLog) |
| AI Paid | Anthropic Claude claude-sonnet-4-6 (unlimited) |
| RAG | OpenAI embeddings 1536-dim + pgvector cosine |
| Migrations | `scripts/migrate.js` (pg client, idempotent SQL) |
| Подписки | RevenueCat (планируется) |
| Админка | Electron 28 + Vite 5 + React 18 |
| Build Mobile | EAS (Expo Application Services) |
| Monorepo | pnpm workspaces |

---

## МОНЕТИЗАЦИЯ

| Тариф | Цена | Что включено |
|-------|------|--------------|
| Free | $0 | Дневник, поведение, SOS, 3 AI сообщения/день (GPT-4o-mini) |
| Premium Monthly | $4.99/мес | Claude claude-sonnet-4-6 безлимит, аналитика, RAG база знаний |
| Premium Yearly | $34.99/год | Всё что в Monthly, скидка ~42% |
| Superuser | internal | Без лимитов, без подписки — 3 аккаунта команды |

> SOS дыхание — **всегда бесплатно**

---

## АРХИТЕКТУРНЫЕ РЕШЕНИЯ

| Решение | Почему |
|---------|--------|
| Explicit SELECT в Prisma | Защита от краша при отставании prod DB от схемы |
| migrate.js на Vercel build | Нет прямого доступа к Neon из CI; `IF NOT EXISTS` — идемпотентно |
| FALLBACK_ARTICLES в useState | Экран библиотеки никогда не пустой, API заменяет данные фоново |
| buildKnowledgeContext cap 800 tok | Снижение API стоимости на 90% vs отправки всего контекста |
| Bearer token `Authorization: Bearer {userId}` | Простая мобильная auth без cookie overhead |
