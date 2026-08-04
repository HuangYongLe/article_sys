import { and, eq, sql } from 'drizzle-orm'
import { useDb, schema } from '../../../utils/db'
import { toPublicAuthor } from '../../../utils/dto'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username
  if (!username) {
    throw createError({ statusCode: 400, message: '缺少用户名' })
  }

  const db = await useDb()
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
    columns: {
      id: true, username: true, displayName: true, avatarUrl: true, bio: true, status: true, role: true,
    },
  })
  if (!user || user.status !== 'active') {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.articles)
    .where(and(
      eq(schema.articles.authorId, user.id),
      eq(schema.articles.status, 'published'),
      eq(schema.articles.visibility, 'public'),
    )) as [{ count: number }]

  return { ...toPublicAuthor(user), articleCount: Number(count), role: user.role }
})
