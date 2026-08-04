import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { pageQuerySchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/auth'
import type { UserStatus } from '#shared/types'

const STATUS_VALUES: UserStatus[] = ['pending', 'active', 'disabled', 'rejected']

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const query = getQuery(event)
  const statusFilter = typeof query.status === 'string' && STATUS_VALUES.includes(query.status as UserStatus)
    ? (query.status as UserStatus)
    : 'all'
  const roleFilter = query.role === 'super_admin' || query.role === 'author' ? query.role : undefined
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const { page, pageSize } = pageQuerySchema.parse({ page: query.page, pageSize: query.pageSize })

  const db = await useDb()

  const where = and(
    statusFilter !== 'all' ? eq(schema.users.status, statusFilter) : undefined,
    roleFilter ? eq(schema.users.role, roleFilter) : undefined,
    search
      ? or(
          like(schema.users.username, `%${search}%`),
          like(schema.users.displayName, `%${search}%`),
          like(schema.users.email, `%${search}%`),
        )
      : undefined,
  )

  // 不受 status 筛选影响的总数（但跟随搜索/角色筛选），用于「全部」标签固定显示
  const whereNoStatus = and(
    roleFilter ? eq(schema.users.role, roleFilter) : undefined,
    search
      ? or(
          like(schema.users.username, `%${search}%`),
          like(schema.users.displayName, `%${search}%`),
          like(schema.users.email, `%${search}%`),
        )
      : undefined,
  )

  const totalRes = await db.select({ c: sql<number>`count(*)` }).from(schema.users).where(where)
  const total = Number(totalRes[0]?.c ?? 0)

  const grandTotalRes = await db.select({ c: sql<number>`count(*)` }).from(schema.users).where(whereNoStatus)
  const grandTotal = Number(grandTotalRes[0]?.c ?? 0)

  const rows = await db.query.users.findMany({
    where,
    orderBy: [desc(schema.users.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  const countRows = await db.select({
    status: schema.users.status,
    c: sql<number>`count(*)`,
  }).from(schema.users).where(whereNoStatus).groupBy(schema.users.status)

  const counts = STATUS_VALUES.reduce((acc, s) => {
    acc[s] = 0
    return acc
  }, {} as Record<UserStatus, number>)
  for (const row of countRows) {
    if (row.status && row.status in counts) {
      counts[row.status as UserStatus] = Number(row.c)
    }
  }

  const items = rows.map(r => ({
    id: r.id,
    username: r.username,
    displayName: r.displayName,
    email: r.email,
    role: r.role,
    status: r.status,
    avatarUrl: r.avatarUrl,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt ? r.approvedAt.getTime() : null,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.getTime(),
    lastLoginAt: r.lastLoginAt ? r.lastLoginAt.getTime() : null,
  }))

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    counts,
    grandTotal,
  }
})
