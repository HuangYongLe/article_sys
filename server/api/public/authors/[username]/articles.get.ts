import { and, eq, like, desc, sql, inArray } from 'drizzle-orm'
import { publicAuthorArticlesQuerySchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../../utils/db'
import { toPublicAuthor, toPublicArticleListItem } from '../../../../utils/dto'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username
  if (!username) {
    throw createError({ statusCode: 400, message: '缺少用户名' })
  }
  const parsed = publicAuthorArticlesQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '查询参数不合法' })
  }
  const { page, pageSize, q } = parsed.data

  const db = await useDb()
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
    columns: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, status: true },
  })
  if (!user || user.status !== 'active') {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const where = and(
    eq(schema.articles.authorId, user.id),
    eq(schema.articles.status, 'published'),
    eq(schema.articles.visibility, 'public'),
    q ? like(schema.articles.title, `%${q}%`) : undefined,
  )
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.articles)
    .where(where) as [{ total: number }]

  const items = await db.query.articles.findMany({
    where,
    orderBy: desc(schema.articles.publishedAt),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  const ids = items.map(a => a.id)
  const tagRows = ids.length
    ? await db.select({
        articleId: schema.articleTags.articleId,
        name: schema.tags.name,
        slug: schema.tags.slug,
      })
      .from(schema.articleTags)
      .innerJoin(schema.tags, eq(schema.articleTags.tagId, schema.tags.id))
      .where(inArray(schema.articleTags.articleId, ids))
    : []
  const tagMap = new Map<string, { name: string, slug: string }[]>()
  for (const r of tagRows) {
    const list = tagMap.get(r.articleId) ?? []
    list.push({ name: r.name, slug: r.slug })
    tagMap.set(r.articleId, list)
  }

  return {
    items: items.map(a => toPublicArticleListItem(a, toPublicAuthor(user), tagMap.get(a.id) ?? [])),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
})
