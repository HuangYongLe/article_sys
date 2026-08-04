import { eq } from 'drizzle-orm'
import { profileUpdateSchema } from '#shared/utils/validators'
import { useDb, schema } from '../utils/db'
import { getCurrentUser, toSessionUser } from '../utils/auth'
import { logAudit } from '../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const parsed = profileUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }

  const patch: Record<string, unknown> = {}
  if (parsed.data.displayName !== undefined) patch.displayName = parsed.data.displayName
  if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio
  if (parsed.data.avatarUrl !== undefined) patch.avatarUrl = parsed.data.avatarUrl
  if (!Object.keys(patch).length) return { ok: true }

  const db = await useDb()
  const [updated] = await db.update(schema.users)
    .set(patch)
    .where(eq(schema.users.id, user.id))
    .returning()

  await setUserSession(event, { user: toSessionUser(updated!) })
  await logAudit({ actorId: user.id, action: 'user.update_profile', targetType: 'user', targetId: user.id })
  return { ok: true }
})
