import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from './db'
import type { User } from '../database/schema'

export type SessionUser = {
  id: string
  username: string
  role: 'super_admin' | 'author'
  displayName: string
  avatarUrl: string | null
  tokenVersion: number
  mustChangePassword: boolean
}

/** 把 DB User 映射为写入加密 Cookie 的最小会话对象 */
export function toSessionUser(u: User): SessionUser {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    tokenVersion: u.tokenVersion,
    mustChangePassword: u.mustChangePassword,
  }
}

/**
 * 校验会话并回源 DB 复核（status=active 且 tokenVersion 一致）。
 * 任何一步不满足即 401，并顺手清掉无效会话。
 */
export async function getCurrentUser(event: H3Event): Promise<User> {
  const session = await requireUserSession(event)
  const sessionUser = session.user as SessionUser

  const db = await useDb()
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, sessionUser.id),
  })

  if (!user || user.status !== 'active' || user.tokenVersion !== sessionUser.tokenVersion) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: '登录状态已失效，请重新登录' })
  }
  return user
}

/** 任意已登录且未被禁用的用户（author / super_admin 均可） */
export async function requireAuthor(event: H3Event): Promise<User> {
  return getCurrentUser(event)
}

/** 仅超级管理员；非超管返回 404 隐藏中控台的存在 */
export async function requireSuperAdmin(event: H3Event): Promise<User> {
  const user = await getCurrentUser(event)
  if (user.role !== 'super_admin') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '页面不存在' })
  }
  return user
}

/**
 * 文章访问控制：作者本人或超管可访问，否则 404（不暴露资源存在性）。
 * 返回 [当前用户, 文章]。
 */
export async function requireArticleAccess(event: H3Event, articleId: string) {
  const user = await getCurrentUser(event)
  const db = await useDb()

  const article = await db.query.articles.findFirst(
    user.role === 'super_admin'
      ? { where: eq(schema.articles.id, articleId) }
      : { where: and(eq(schema.articles.id, articleId), eq(schema.articles.authorId, user.id)) },
  )

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: '文章不存在' })
  }
  return { user, article }
}
