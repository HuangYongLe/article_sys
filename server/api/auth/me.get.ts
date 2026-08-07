import { getHeader } from 'h3'
import { getCurrentUser, toSessionUser } from '../../utils/auth'

/**
 * 回源 DB 刷新登录态（角色/状态变化后前端可调用同步）。
 * Bearer Token 请求的 Token 已内嵌 tokenVersion，无需写 Cookie，跳过 setUserSession。
 */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!getHeader(event, 'authorization')?.startsWith('Bearer ')) {
    await setUserSession(event, { user: toSessionUser(user) })
  }

  return { user: toSessionUser(user), bio: user.bio, email: user.email }
})
