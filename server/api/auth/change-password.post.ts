import { eq } from 'drizzle-orm'
import { changePasswordSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { getCurrentUser, toSessionUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  const parsed = changePasswordSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { currentPassword, newPassword } = parsed.data

  const ok = await verifyPassword(user.passwordHash, currentPassword).catch(() => false)
  if (!ok) {
    throw createError({ statusCode: 400, message: '当前密码不正确' })
  }

  const newVersion = user.tokenVersion + 1
  const db = await useDb()
  const [updated] = await db.update(schema.users)
    .set({
      passwordHash: await hashPassword(newPassword),
      tokenVersion: newVersion, // 其他设备上的旧会话全部失效
      mustChangePassword: false,
    })
    .where(eq(schema.users.id, user.id))
    .returning()

  // 当前会话续期到新版本，本设备无需重新登录
  await setUserSession(event, { user: toSessionUser(updated!) })
  await logAudit({ actorId: user.id, action: 'auth.change_password', targetType: 'user', targetId: user.id })

  return { ok: true }
})
