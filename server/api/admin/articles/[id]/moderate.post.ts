import { eq } from 'drizzle-orm'
import { adminArticleModerateSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../../utils/db'
import { requireSuperAdmin } from '../../../../utils/auth'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少文章 ID' })
  }

  const parsed = adminArticleModerateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { status, visibility, note } = parsed.data
  if (status === undefined && visibility === undefined && note === undefined) {
    throw createError({ statusCode: 400, message: '请至少指定一项变更' })
  }

  const db = await useDb()
  const article = await db.query.articles.findFirst({ where: eq(schema.articles.id, id) })
  if (!article) {
    throw createError({ statusCode: 404, message: '文章不存在' })
  }

  const patch: Record<string, unknown> = {}
  if (status !== undefined) {
    patch.status = status
    if (status === 'published' && !article.publishedAt) patch.publishedAt = new Date()
  }
  if (visibility !== undefined) patch.visibility = visibility
  if (note !== undefined) patch.moderationNote = note
  patch.moderatedBy = admin.id
  patch.moderatedAt = new Date()

  await db.update(schema.articles).set(patch).where(eq(schema.articles.id, id))
  await logAudit({
    actorId: admin.id,
    action: 'article.moderate',
    targetType: 'article',
    targetId: id,
    payload: { status: status ?? null, visibility: visibility ?? null, note: note ?? null, title: article.title },
  })
  return { ok: true }
})
