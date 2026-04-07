# @mamalog/database

Prisma ORM package for the Mamalog monorepo, connected to Neon serverless Postgres.

## Local .env

Prisma requires a `.env` file in this directory to locate the database.
This file is **not committed** (covered by root `.gitignore`).

Keep `packages/database/.env` in sync with the root `.env`:

```
DATABASE_URL=<copy from root .env>
DATABASE_URL_UNPOOLED=<copy from root .env>
```

`DATABASE_URL` — pooled connection (used at runtime via `@prisma/client`).  
`DATABASE_URL_UNPOOLED` — direct connection (used by Prisma CLI for migrations/push).

## Scripts

```bash
pnpm db:generate   # generate Prisma Client
pnpm db:push       # push schema to database (no migration files)
pnpm db:studio     # open Prisma Studio
```

## Exports

- Shared Prisma client exported for use in `apps/web` and other packages
