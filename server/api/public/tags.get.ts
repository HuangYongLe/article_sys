import { and, eq, sql, desc } from 'drizzle-orm'
import { useDb, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const db = await useDb()
  const rows = await db.select({
    name: schema.tags.name,
    slug: schema.tags.slug,
    count: sql<number>`count(*)`,
  })
    .from(schema.tags)
    .innerJoin(schema.articleTags, eq(schema.tags.id, schema.articleTags.tagId))
    .innerJoin(schema.articles, and(
      eq(schema.articles.id, schema.articleTags.articleId),
      eq(schema.articles.status, 'published'),
      eq(schema.articles.visibility, 'public'),
    ))
    .groupBy(schema.tags.id)
    .orderBy(desc(sql`count(*)`))
    .limit(40)

  return rows.map(r => ({ name: r.name, slug: r.slug, count: Number(r.count) }))
})
