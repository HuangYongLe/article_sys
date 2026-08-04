import { and, eq, like, or, desc, sql, inArray } from 'drizzle-orm'
import { publicArticleQuerySchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { toPublicAuthor, toPublicArticleListItem } from '../../utils/dto'

export default defineEventHandler(async (event) => {
  const parsed = publicArticleQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '查询参数不合法' })
  }
  const { page, pageSize, tag, q, sort } = parsed.data

  const db = await useDb()

  // 标签筛选 -> 预先解析命中的文章 id
  let tagArticleIds: string[] | undefined
  if (tag) {
    const t = await db.query.tags.findFirst({ where: eq(schema.tags.slug, tag), columns: { id: true } })
    if (!t) return { items: [], meta: { page, pageSize, total: 0, totalPages: 1 } }
    const rows = await db.select({ articleId: schema.articleTags.articleId })
      .from(schema.articleTags).where(eq(schema.articleTags.tagId, t.id))
    tagArticleIds = rows.map(r => r.articleId)
    if (tagArticleIds.length === 0) return { items: [], meta: { page, pageSize, total: 0, totalPages: 1 } }
  }

  const conditions = [
    and(eq(schema.articles.status, 'published'), eq(schema.articles.visibility, 'public')),
    tagArticleIds ? inArray(schema.articles.id, tagArticleIds) : undefined,
    q ? or(like(schema.articles.title, `%${q}%`), like(schema.articles.summary, `%${q}%`)) : undefined,
  ].filter(Boolean) as any[]
  const where = and(...conditions)
  const orderBy = sort === 'hot' ? desc(schema.articles.viewCount) : desc(schema.articles.publishedAt)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.articles)
    .where(where) as [{ total: number }]

  const items = await db.query.articles.findMany({ where, orderBy, limit: pageSize, offset: (page - 1) * pageSize })

  const authorIds = items.map(a => a.authorId)
  const authors = authorIds.length
    ? await db.select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
      }).from(schema.users).where(inArray(schema.users.id, authorIds))
    : []
  const authorMap = new Map(authors.map(u => [u.id, toPublicAuthor(u)]))

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
    items: items.map(a => toPublicArticleListItem(
      a,
      authorMap.get(a.authorId) ?? { username: 'unknown', displayName: '未知作者', avatarUrl: null, bio: null },
      tagMap.get(a.id) ?? [],
    )),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
})
