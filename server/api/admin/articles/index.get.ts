import { and, eq, like, or, desc, sql, inArray } from 'drizzle-orm'
import { adminArticleQuerySchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/auth'
import { toAdminArticleListItem } from '../../../utils/dto'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const parsed = adminArticleQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '查询参数不合法' })
  }
  const { page, pageSize, status, visibility, author, q } = parsed.data

  const db = await useDb()

  // 按作者用户名筛选 -> 解析为 authorId
  let authorId: string | undefined
  if (author) {
    const u = await db.query.users.findFirst({ where: eq(schema.users.username, author), columns: { id: true } })
    if (!u) {
      return {
        items: [],
        meta: { page, pageSize, total: 0, totalPages: 1 },
        counts: { draft: 0, published: 0, archived: 0 },
      }
    }
    authorId = u.id
  }

  const baseConditions = [
    authorId ? eq(schema.articles.authorId, authorId) : undefined,
    visibility ? eq(schema.articles.visibility, visibility) : undefined,
    q ? or(like(schema.articles.title, `%${q}%`), like(schema.articles.summary, `%${q}%`)) : undefined,
  ].filter(Boolean) as any[]

  const whereNoStatus = baseConditions.length ? and(...baseConditions) : undefined
  const where = status
    ? and(...[...baseConditions, eq(schema.articles.status, status)])
    : whereNoStatus

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.articles)
    .where(where) as [{ total: number }]

  // 不受 status 筛选影响的总数（但跟随作者/可见性/搜索筛选），用于「全部」标签固定显示
  const [{ grandTotal }] = await db
    .select({ grandTotal: sql<number>`count(*)` })
    .from(schema.articles)
    .where(whereNoStatus) as [{ grandTotal: number }]

  const items = await db.query.articles.findMany({
    where,
    orderBy: desc(schema.articles.updatedAt),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  // 作者 / 审核人 / 标签
  const authorIds = items.map(a => a.authorId)
  const authors = authorIds.length
    ? await db.select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
      }).from(schema.users).where(inArray(schema.users.id, authorIds))
    : []
  const authorMap = new Map(authors.map(u => [u.id, u]))

  const modIds = items.map(a => a.moderatedBy).filter(Boolean) as string[]
  const mods = modIds.length
    ? await db.select({ id: schema.users.id, username: schema.users.username })
      .from(schema.users).where(inArray(schema.users.id, modIds))
    : []
  const modMap = new Map(mods.map(u => [u.id, u]))

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

  const [countsRow] = await db
    .select({
      draft: sql<number>`sum(case when ${schema.articles.status} = 'draft' then 1 else 0 end)`,
      published: sql<number>`sum(case when ${schema.articles.status} = 'published' then 1 else 0 end)`,
      archived: sql<number>`sum(case when ${schema.articles.status} = 'archived' then 1 else 0 end)`,
    })
    .from(schema.articles)
    .where(whereNoStatus) as [{ draft: number, published: number, archived: number }]

  return {
    items: items.map(a => toAdminArticleListItem(
      a,
      authorMap.get(a.authorId) ?? { username: 'unknown', displayName: '已删除用户', avatarUrl: null },
      a.moderatedBy ? (modMap.get(a.moderatedBy) ?? null) : null,
      tagMap.get(a.id) ?? [],
    )),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    counts: {
      draft: Number(countsRow?.draft ?? 0),
      published: Number(countsRow?.published ?? 0),
      archived: Number(countsRow?.archived ?? 0),
    },
    grandTotal: Number(grandTotal ?? 0),
  }
})
