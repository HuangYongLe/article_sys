import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb, schema } from './db'
import { requireSuperAdmin } from './auth'
import type { User } from '../database/schema'

/**
 * 取待管理目标用户并做基础防护：
 * - 必须存在
 * - 不能操作当前登录的超管自己（避免自锁）
 * - 不能管理其他超级管理员账号
 */
export async function getManageableUser(event: H3Event, id: string): Promise<{ admin: User, target: User }> {
  const admin = await requireSuperAdmin(event)
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少用户 ID' })
  }
  if (id === admin.id) {
    throw createError({ statusCode: 400, message: '不能操作当前登录的账号' })
  }
  const db = await useDb()
  const target = await db.query.users.findFirst({ where: eq(schema.users.id, id) })
  if (!target) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }
  if (target.role === 'super_admin') {
    throw createError({ statusCode: 400, message: '不能管理超级管理员账号' })
  }
  return { admin, target }
}
