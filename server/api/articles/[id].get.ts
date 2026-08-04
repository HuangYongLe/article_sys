import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../utils/db'
import { requireArticleAccess } from '../../utils/auth'
import { toArticleDTO } from '../../utils/dto'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const { article } = await requireArticleAccess(event, id)

  const db = await useDb()
  const tagRows = await db.select({ tagId: schema.articleTags.tagId })
    .from(schema.articleTags)
    .where(eq(schema.articleTags.articleId, article.id))

  return toArticleDTO(article, tagRows.map(r => r.tagId))
})
