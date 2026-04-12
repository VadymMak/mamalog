// Run on Vercel build to apply schema changes that can't go through prisma db push
// Uses DATABASE_URL_UNPOOLED (direct connection, not pooler) for DDL statements

const { Client } = require('pg')

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  })
  await client.connect()
  console.log('Connected to database')

  const migrations = [
    // User table
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperUser" BOOLEAN NOT NULL DEFAULT false',
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT \'ru\'',

    // AIUsageLog table — matches Prisma schema (id, userId, createdAt)
    `CREATE TABLE IF NOT EXISTS "AIUsageLog" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
    )`,
    'CREATE INDEX IF NOT EXISTS "AIUsageLog_userId_createdAt_idx" ON "AIUsageLog"("userId", "createdAt")',

    // KnowledgeBase extra columns
    'ALTER TABLE "KnowledgeBase" ADD COLUMN IF NOT EXISTS "trustIndex" INTEGER NOT NULL DEFAULT 3',
    'ALTER TABLE "KnowledgeBase" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'approved\'',
    'ALTER TABLE "KnowledgeBase" ADD COLUMN IF NOT EXISTS "authorName" TEXT',
    'ALTER TABLE "KnowledgeBase" ADD COLUMN IF NOT EXISTS "authorRole" TEXT',
    'ALTER TABLE "KnowledgeBase" ADD COLUMN IF NOT EXISTS "ageGroup" TEXT',

    // Backfill: mark existing KnowledgeBase rows as approved if verified=true
    'UPDATE "KnowledgeBase" SET "status" = \'approved\' WHERE "verified" = true AND "status" = \'approved\'',

    // Push token for Expo notifications
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushToken" TEXT',

    // AIUsageLog — add date + count columns for per-day upsert tracking
    'ALTER TABLE "AIUsageLog" ADD COLUMN IF NOT EXISTS "date" TEXT NOT NULL DEFAULT \'\'',
    'ALTER TABLE "AIUsageLog" ADD COLUMN IF NOT EXISTS "count" INTEGER NOT NULL DEFAULT 1',
    'CREATE UNIQUE INDEX IF NOT EXISTS "AIUsageLog_userId_date_key" ON "AIUsageLog"("userId", "date")',
    'DROP INDEX IF EXISTS "AIUsageLog_userId_createdAt_idx"',
    'CREATE INDEX IF NOT EXISTS "AIUsageLog_userId_date_idx" ON "AIUsageLog"("userId", "date")',
    // Backfill date from createdAt for existing rows (safe — only affects rows with empty date)
    'UPDATE "AIUsageLog" SET "date" = TO_CHAR("createdAt", \'YYYY-MM-DD\') WHERE "date" = \'\'',

    // Bookmark table
    `CREATE TABLE IF NOT EXISTS "Bookmark" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "articleId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Bookmark_userId_articleId_key" UNIQUE ("userId", "articleId")
    )`,
    'CREATE INDEX IF NOT EXISTS "Bookmark_userId_idx" ON "Bookmark"("userId")',
  ]

  for (const sql of migrations) {
    try {
      await client.query(sql)
      console.log('OK:', sql.slice(0, 60).replace(/\n/g, ' '))
    } catch (e) {
      console.error('Skip:', e.message)
    }
  }

  await client.end()
  console.log('Migration complete')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
