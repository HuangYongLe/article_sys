import { eq } from 'drizzle-orm'
import { articleStatusSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../utils/db'
import { requireArticleAccess } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'
import { toArticleDTO } from '../../../utils/dto'

/** 作者只操作 status（visibility 归超管管） */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { user, article } = await requireArticleAccess(event, id)

  const parsed = articleStatusSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '参数不合法' })
  }
  const { action } = parsed.data

  const patch
    = action === 'publish'
      ? { status: 'published' as const, publishedAt: article.publishedAt ?? new Date() }
      : action === 'unpublish'
        ? { status: 'draft' as const }
        : { status: 'archived' as const }

  if (action === 'publish' && !article.title.trim()) {
    throw createError({ statusCode: 400, message: '标题为空，无法发布' })
  }

  const db = await useDb()
  const [updated] = await db.update(schema.articles)
    .set(patch)
    .where(eq(schema.articles.id, article.id))
    .returning()

  await logAudit({ actorId: user.id, action: `article.${action}`, targetType: 'article', targetId: article.id })
  return toArticleDTO(updated!)
})
