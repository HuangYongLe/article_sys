import { eq } from 'drizzle-orm'
import { loginSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { toSessionUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'
import { verifyCaptcha } from '../../utils/captcha'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 10

export default defineEventHandler(async (event) => {
  const parsed = loginSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { username, password, captchaId, captchaAnswer } = parsed.data

  // 人机验证（一次性，失败即要求重新验证）
  verifyCaptcha(event, captchaId, captchaAnswer)

  const db = await useDb()
  const user = await db.query.users.findFirst({ where: eq(schema.users.username, username) })

  // 统一错误文案，不暴露"用户是否存在"
  const invalidError = () => createError({ statusCode: 401, message: '用户名或密码错误' })

  if (!user) {
    // 恒定时间防护：即使用户不存在也走一次哈希验证
    await verifyPassword('$scrypt$n=16384,r=8,p=1$demo$demo', password).catch(() => false)
    throw invalidError()
  }

  // 锁定检查
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
    throw createError({ statusCode: 429, message: `尝试次数过多，请 ${minutes} 分钟后再试` })
  }

  const ok = await verifyPassword(user.passwordHash, password).catch(() => false)
  if (!ok) {
    const attempts = user.failedAttempts + 1
    const locked = attempts >= MAX_ATTEMPTS
    await db.update(schema.users)
      .set({
        failedAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(schema.users.id, user.id))
    if (locked) {
      await logAudit({ actorId: null, action: 'auth.locked', targetType: 'user', targetId: user.id })
      throw createError({ statusCode: 429, message: `尝试次数过多，账号已锁定 ${LOCK_MINUTES} 分钟` })
    }
    throw invalidError()
  }

  if (user.status !== 'active') {
    const message = user.status === 'pending'
      ? '账号正在等待管理员审核，暂时无法登录'
      : user.status === 'rejected'
        ? '注册申请未通过审核，如有疑问请联系管理员'
        : '账号已被禁用，请联系管理员'
    throw createError({ statusCode: 403, message })
  }

  // 成功：清空失败计数、记录登录时间
  await db.update(schema.users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(schema.users.id, user.id))

  await setUserSession(event, {
    user: toSessionUser(user),
    loggedInAt: Date.now(),
  })
  await logAudit({ actorId: user.id, action: 'auth.login', targetType: 'user', targetId: user.id })

  return { ok: true, user: toSessionUser(user) }
})
