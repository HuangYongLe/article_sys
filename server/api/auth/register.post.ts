import { eq } from 'drizzle-orm'
import { registerSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../utils/db'
import { logAudit } from '../../utils/audit'
import { verifyCaptcha } from '../../utils/captcha'

export default defineEventHandler(async (event) => {
  const parsed = registerSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '参数不合法' })
  }
  const { username, password, displayName, email, captchaId, captchaAnswer } = parsed.data

  // 人机验证（一次性，失败即要求重新验证）
  verifyCaptcha(event, captchaId, captchaAnswer)

  const db = await useDb()

  const byName = await db.query.users.findFirst({ where: eq(schema.users.username, username) })
  if (byName) {
    throw createError({ statusCode: 409, message: '该用户名已被占用' })
  }
  if (email) {
    const byEmail = await db.query.users.findFirst({ where: eq(schema.users.email, email) })
    if (byEmail) {
      throw createError({ statusCode: 409, message: '该邮箱已被注册' })
    }
  }

  const passwordHash = await hashPassword(password)
  const [created] = await db.insert(schema.users).values({
    username,
    displayName,
    email: email ?? null,
    passwordHash,
    role: 'author',
    status: 'pending',
  }).returning({ id: schema.users.id, username: schema.users.username })

  await logAudit({
    actorId: created.id,
    action: 'user.register',
    targetType: 'user',
    targetId: created.id,
    payload: { username, email: email ?? null },
  })

  return {
    ok: true,
    status: 'pending',
    message: '注册成功，等待管理员审核通过后方可登录',
  }
})
