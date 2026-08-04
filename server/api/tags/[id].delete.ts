import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../utils/db'
import { requireAuthor } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthor(event)
  const id = getRouterParam(event, 'id')!

  const db = await useDb()
  const [deleted] = await db.delete(schema.tags)
    .where(and(eq(schema.tags.id, id), eq(schema.tags.ownerId, user.id)))
    .returning({ id: schema.tags.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: '标签不存在' })
  }
  return { ok: true }
})
