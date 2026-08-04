import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { tagCreateSchema } from '#shared/utils/validators'
import { toSlug } from '#shared/utils/slug'
import { useDb, schema } from '../../utils/db'
import { requireAuthor } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthor(event)
  const parsed = tagCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const name = parsed.data.name
  const slug = toSlug(name) || `tag-${nanoid(6).toLowerCase()}`

  const db = await useDb()
  // 幂等：同名（同 slug）标签直接返回已有的
  const existing = await db.query.tags.findFirst({
    where: and(eq(schema.tags.ownerId, user.id), eq(schema.tags.slug, slug)),
  })
  if (existing) return existing

  const [tag] = await db.insert(schema.tags)
    .values({ ownerId: user.id, name, slug })
    .returning()
  return tag!
})
