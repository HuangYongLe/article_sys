import { and, eq, sql } from 'drizzle-orm'
import { useDb, schema } from '../../../../utils/db'
import { toPublicAuthor, toPublicArticleDetail } from '../../../../utils/dto'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username
  const slug = event.context.params?.slug
  if (!username || !slug) {
    throw createError({ statusCode: 400, message: '参数缺失' })
  }

  const db = await useDb()
  const author = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
    columns: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, status: true },
  })
  if (!author || author.status !== 'active') {
    throw createError({ statusCode: 404, message: '文章不存在' })
  }

  const article = await db.query.articles.findFirst({
    where: and(
      eq(schema.articles.authorId, author.id),
      eq(schema.articles.slug, slug),
      eq(schema.articles.status, 'published'),
      eq(schema.articles.visibility, 'public'),
    ),
  })
  if (!article) {
    throw createError({ statusCode: 404, message: '文章不存在' })
  }

  // 阅读量 +1（仅记录，不影响本次返回内容）
  await db.update(schema.articles)
    .set({ viewCount: sql`${schema.articles.viewCount} + 1` })
    .where(eq(schema.articles.id, article.id))

  const tagRows = await db.select({ name: schema.tags.name, slug: schema.tags.slug })
    .from(schema.articleTags)
    .innerJoin(schema.tags, eq(schema.articleTags.tagId, schema.tags.id))
    .where(eq(schema.articleTags.articleId, article.id))

  const updated = await db.query.articles.findFirst({ where: eq(schema.articles.id, article.id) })
  return toPublicArticleDetail(updated ?? article, toPublicAuthor(author), tagRows)
})
