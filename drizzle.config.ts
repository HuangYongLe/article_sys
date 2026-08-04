import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const url = process.env.TURSO_DATABASE_URL || 'file:./local.db'
const isLocalFile = url.startsWith('file:')

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './drizzle',
  // 本地 file: 用 sqlite 方言；远程 Turso 用 turso 方言（需要 authToken）
  ...(isLocalFile
    ? { dialect: 'sqlite' as const, dbCredentials: { url } }
    : { dialect: 'turso' as const, dbCredentials: { url, authToken: process.env.TURSO_AUTH_TOKEN! } }),
  verbose: true,
  strict: true,
})
