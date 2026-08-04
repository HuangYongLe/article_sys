import { and, eq, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { articleUpsertSchema } from '#shared/utils/validators'
import { toSlug } from '#shared/utils/slug'
import { useDb, schema } from '../../utils/db'
import { requireAuthor } from '../../utils/auth'
import { renderMarkdown, countWords } from '../../utils/markdown'
import { logAudit } from '../../utils/audit'
import { toArticleDTO } from '../../utils/dto'

export default defineEventHandler(async (event) => {
  const user = await requireAuthor(event)
  const parsed = articleUpsertSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { title, summary, content, coverUrl, tagIds } = parsed.data

  const db = await useDb()

  // slug：显式提供 > 标题转换 > 随机兜底；同作者冲突自动加后缀
  let slug = parsed.data.slug || toSlug(title) || `post-${nanoid(8).toLowerCase()}`
  const conflict = await db.query.articles.findFirst({
    where: and(eq(schema.articles.authorId, user.id), eq(schema.articles.slug, slug)),
    columns: { id: true },
  })
  if (conflict) {
    if (parsed.data.slug) {
      throw createError({ statusCode: 409, message: '该 slug 已被你的其他文章占用' })
    }
    slug = `${slug.slice(0, 70)}-${nanoid(6).toLowerCase()}`
  }

  // 校验标签归属
  const validTagIds = tagIds?.length
    ? (await db.select({ id: schema.tags.id }).from(schema.tags)
        .where(and(eq(schema.tags.ownerId, user.id), inArray(schema.tags.id, tagIds))))
        .map(t => t.id)
    : []

  const [article] = await db.insert(schema.articles).values({
    authorId: user.id,
    title,
    slug,
    summary: summary ?? null,
    content,
    contentHtml: await renderMarkdown(content),
    coverUrl: coverUrl ?? null,
    wordCount: countWords(content),
  }).returning()

  if (validTagIds.length) {
    await db.insert(schema.articleTags).values(validTagIds.map(tagId => ({ articleId: article!.id, tagId })))
  }

  await logAudit({ actorId: user.id, action: 'article.create', targetType: 'article', targetId: article!.id, payload: { title } })
  return toArticleDTO(article!, validTagIds)
})
