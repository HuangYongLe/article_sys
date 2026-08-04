import { and, eq, like, or, desc, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { pageQuerySchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { requireAuthor } from '../../utils/auth'
import { toArticleDTO } from '../../utils/dto'

const listQuerySchema = pageQuerySchema.extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  q: z.string().trim().max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthor(event)
  const parsed = listQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '查询参数不合法' })
  }
  const { page, pageSize, status, q } = parsed.data

  const db = await useDb()
  const baseConditions = [
    eq(schema.articles.authorId, user.id),
    q ? or(like(schema.articles.title, `%${q}%`), like(schema.articles.summary, `%${q}%`)) : undefined,
  ].filter(Boolean) as any[]
  const whereNoStatus = baseConditions.length ? and(...baseConditions) : undefined
  const where = status ? and(...[...baseConditions, eq(schema.articles.status, status)]) : whereNoStatus

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.articles)
    .where(where) as [{ total: number }]

  const items = await db.query.articles.findMany({
    where,
    orderBy: desc(schema.articles.updatedAt),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  // 批量取标签
  const ids = items.map(a => a.id)
  const tagRows = ids.length
    ? await db.select().from(schema.articleTags).where(inArray(schema.articleTags.articleId, ids))
    : []
  const tagMap = new Map<string, string[]>()
  for (const row of tagRows) {
    const list = tagMap.get(row.articleId) ?? []
    list.push(row.tagId)
    tagMap.set(row.articleId, list)
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
    items: items.map(a => toArticleDTO(a, tagMap.get(a.id) ?? [])),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    counts: {
      draft: Number(countsRow?.draft ?? 0),
      published: Number(countsRow?.published ?? 0),
      archived: Number(countsRow?.archived ?? 0),
    },
  }
})
