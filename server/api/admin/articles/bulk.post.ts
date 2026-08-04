import { eq, inArray } from 'drizzle-orm'
import { adminBulkSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const parsed = adminBulkSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '参数不合法' })
  }
  const { ids, action } = parsed.data

  const db = await useDb()
  const existing = await db.select({ id: schema.articles.id, title: schema.articles.title })
    .from(schema.articles)
    .where(inArray(schema.articles.id, ids))
  if (existing.length === 0) {
    throw createError({ statusCode: 404, message: '未找到文章' })
  }
  const foundIds = existing.map(e => e.id)

  if (action === 'delete') {
    await db.delete(schema.articles).where(inArray(schema.articles.id, foundIds))
    await logAudit({
      actorId: admin.id,
      action: 'article.bulk.delete',
      targetType: 'article',
      targetId: foundIds.join(','),
      payload: { count: foundIds.length, titles: existing.map(e => e.title) },
    })
  }
  else {
    const visibility = action === 'hide' ? 'private' : 'public'
    await db.update(schema.articles)
      .set({ visibility, moderatedBy: admin.id, moderatedAt: new Date() })
      .where(inArray(schema.articles.id, foundIds))
    await logAudit({
      actorId: admin.id,
      action: `article.bulk.${action}`,
      targetType: 'article',
      targetId: foundIds.join(','),
      payload: { visibility, count: foundIds.length },
    })
  }
  return { ok: true, count: foundIds.length }
})
