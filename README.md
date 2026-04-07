# Mamalog

A cross-platform parenting & health logging app — monorepo.

## Apps

| App | Description | Stack |
|-----|-------------|-------|
| `apps/mobile` | Primary mobile app | React Native + Expo |
| `apps/web` | Backend API + web dashboard | Next.js 14 |
| `apps/desktop` | Admin panel (placeholder) | Electron |

## Packages

| Package | Description |
|---------|-------------|
| `packages/types` | Shared TypeScript interfaces |
| `packages/database` | Prisma ORM + Neon DB (coming soon) |

## Getting Started

```bash
# Install all dependencies
pnpm install

# Run mobile (Expo)
pnpm dev:mobile

# Run web (Next.js)
pnpm dev:web
```

## Requirements

- Node >= 20
- pnpm >= 9
