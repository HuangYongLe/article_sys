import { eq, asc } from 'drizzle-orm'
import { useDb, schema } from '../../utils/db'
import { requireAuthor } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthor(event)
  const db = await useDb()
  return db.query.tags.findMany({
    where: eq(schema.tags.ownerId, user.id),
    orderBy: asc(schema.tags.name),
  })
})
