import { and, eq, ne } from 'drizzle-orm'
import { slugCheckSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { requireAuthor } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthor(event)
  const parsed = slugCheckSchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { slug, excludeId } = parsed.data

  const db = await useDb()
  const conflict = await db.query.articles.findFirst({
    where: and(
      eq(schema.articles.authorId, user.id),
      eq(schema.articles.slug, slug),
      excludeId ? ne(schema.articles.id, excludeId) : undefined,
    ),
    columns: { id: true },
  })
  return { available: !conflict }
})
