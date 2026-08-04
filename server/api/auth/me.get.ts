import { getCurrentUser, toSessionUser } from '../../utils/auth'

/** 回源 DB 刷新会话（角色/状态变化后前端可调用同步） */
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  await setUserSession(event, { user: toSessionUser(user) })
  return { user: toSessionUser(user), bio: user.bio, email: user.email }
})
