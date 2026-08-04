import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../utils/db'
import { requireArticleAccess } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { user, article } = await requireArticleAccess(event, id)

  const db = await useDb()
  await db.delete(schema.articles).where(eq(schema.articles.id, article.id))

  await logAudit({
    actorId: user.id,
    action: 'article.delete',
    targetType: 'article',
    targetId: article.id,
    payload: { title: article.title, authorId: article.authorId },
  })
  return { ok: true }
})
