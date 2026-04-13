# Mamalog — Lessons Learned

## SuperUser Architecture (April 2026)

### Problem
SuperUser status was stored in local `useState` with async loading.
This caused race conditions — `requirePro()` was called synchronously
before async `isSuperUser` loaded → Paywall appeared for SuperUsers.

Also: `AsyncStorage` was not imported in `AIAdvisorScreen` while being
used in the 20-message recheck block — a silent crash.

### Solution
Single source of truth via ProContext:
1. `ProContext` loads `isSuperUser` from AsyncStorage on app start (inside `refresh()`)
2. After first AI response with `isSuperUser: true` → cache in AsyncStorage as `"true"`
3. `useProGate` reads `isSuperUser` from `usePro()` context — always synchronous
4. `requirePro()` = `isPro || isSuperUser` → no Paywall for either

### Rules
- NEVER store user tier in local `useState` — always use `ProContext`
- NEVER check `isSuperUser` in multiple places — single source: `ProContext`
- ALWAYS import `AsyncStorage` before using it (not just `get`/`set` wrappers)
- ALWAYS add `isSending` guard to prevent double-send race condition
- SuperUser: Claude Opus, no limit, no counter, no Paywall
- PRO: OpenAI gpt-4o-mini, 40/day, hidden counter, no Paywall
- FREE: OpenAI gpt-4o-mini, 3/day, visible counter, Paywall after limit

### AI Model Routing
| Tier | Model | Limit | Counter |
|------|-------|-------|---------|
| SuperUser | `claude-opus-4-6` (Anthropic) | Unlimited | `👑 SuperUser — безлимит` |
| PRO | `gpt-4o-mini` (OpenAI) | 40/day | Hidden |
| FREE | `gpt-4o-mini` (OpenAI) | 3/day | Visible "Осталось X из 3" |

### Backend Behaviour (apps/web/app/api/ai/chat/route.ts)
- SuperUser: skips `aIUsageLog` count check AND creation
- PRO/FREE: counted in `aIUsageLog`, blocked on 429 when limit reached
- Response includes `showCounter` field to drive mobile UI

### Token / Session Lifetime
- Mobile session expires: 30 days
- `TOKEN_EXPIRY` stored in AsyncStorage `@mamalog/token_expiry`
- On app start: if `daysLeft < 7` → silent refresh via `POST /api/auth/refresh`
- If fully expired → force logout

### AsyncStorage Keys (mobile)
| Key | Value | Purpose |
|-----|-------|---------|
| `@mamalog/ai_is_superuser` | `"true"` / absent | SuperUser cache |
| `@mamalog/token_expiry` | ISO date string | Session expiry |
| `@mamalog/user_id` | plain userId string | Bearer token for API |
| `@mamalog/ai_count_YYYY-MM-DD` | number | Daily FREE message counter |
