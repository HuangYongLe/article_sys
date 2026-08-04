import { sql } from 'drizzle-orm'
import { bootstrapSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { toSessionUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

/**
 * 一次性初始化接口：仅当 users 表为空时可创建首个超级管理员。
 * 之后永久返回 410 Gone。
 */
export default defineEventHandler(async (event) => {
  const db = await useDb()

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .all() as [{ count: number }]

  if (count > 0) {
    throw createError({ statusCode: 410, message: '系统已初始化' })
  }

  const parsed = bootstrapSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { username, password, displayName } = parsed.data

  const [admin] = await db.insert(schema.users)
    .values({
      username,
      passwordHash: await hashPassword(password),
      displayName,
      role: 'super_admin',
    })
    .returning()

  await setUserSession(event, { user: toSessionUser(admin!), loggedInAt: Date.now() })
  await logAudit({ actorId: admin!.id, action: 'system.bootstrap', targetType: 'system', targetId: admin!.id })

  return { ok: true, user: toSessionUser(admin!) }
})
