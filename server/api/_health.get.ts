import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = await useDb()
  const result = await db.run(sql`select datetime('now') as now`)
  return {
    ok: true,
    dbTime: result.rows[0]?.now ?? null,
  }
})
