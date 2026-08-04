import { and, eq, ne, inArray } from 'drizzle-orm'
import { articleUpsertSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { requireArticleAccess } from '../../utils/auth'
import { renderMarkdown, countWords } from '../../utils/markdown'
import { logAudit } from '../../utils/audit'
import { toArticleDTO } from '../../utils/dto'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { user, article } = await requireArticleAccess(event, id)

  const parsed = articleUpsertSchema.partial().safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { title, slug, summary, content, coverUrl, tagIds } = parsed.data

  const db = await useDb()

  // slug 冲突检查（改 slug 时）
  if (slug && slug !== article.slug) {
    const conflict = await db.query.articles.findFirst({
      where: and(
        eq(schema.articles.authorId, article.authorId),
        eq(schema.articles.slug, slug),
        ne(schema.articles.id, article.id),
      ),
      columns: { id: true },
    })
    if (conflict) throw createError({ statusCode: 409, message: '该 slug 已被其他文章占用' })
  }

  const patch: Record<string, unknown> = {}
  if (title !== undefined) patch.title = title
  if (slug !== undefined) patch.slug = slug
  if (summary !== undefined) patch.summary = summary
  if (coverUrl !== undefined) patch.coverUrl = coverUrl
  if (content !== undefined) {
    patch.content = content
    patch.contentHtml = await renderMarkdown(content)
    patch.wordCount = countWords(content)
  }

  const [updated] = Object.keys(patch).length
    ? await db.update(schema.articles).set(patch).where(eq(schema.articles.id, article.id)).returning()
    : [article]

  // 标签整体替换
  let finalTagIds: string[] | undefined
  if (tagIds !== undefined) {
    const validTagIds = tagIds.length
      ? (await db.select({ id: schema.tags.id }).from(schema.tags)
          .where(and(eq(schema.tags.ownerId, article.authorId), inArray(schema.tags.id, tagIds))))
          .map(t => t.id)
      : []
    await db.delete(schema.articleTags).where(eq(schema.articleTags.articleId, article.id))
    if (validTagIds.length) {
      await db.insert(schema.articleTags).values(validTagIds.map(tagId => ({ articleId: article.id, tagId })))
    }
    finalTagIds = validTagIds
  }
  else {
    finalTagIds = (await db.select({ tagId: schema.articleTags.tagId })
      .from(schema.articleTags)
      .where(eq(schema.articleTags.articleId, article.id))).map(r => r.tagId)
  }

  await logAudit({ actorId: user.id, action: 'article.update', targetType: 'article', targetId: article.id })
  return toArticleDTO(updated!, finalTagIds)
})
