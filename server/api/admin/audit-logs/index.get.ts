import { and, eq, like, desc, sql, inArray } from 'drizzle-orm'
import { auditQuerySchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/auth'
import { toAdminAuditLogItem } from '../../../utils/dto'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const parsed = auditQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '查询参数不合法' })
  }
  const { page, pageSize, action, targetType, actor, q } = parsed.data

  const db = await useDb()

  // actor 支持用户名或 id
  let actorId: string | undefined
  if (actor) {
    const u = await db.query.users.findFirst({ where: eq(schema.users.username, actor), columns: { id: true } })
    actorId = u?.id ?? actor
  }

  const conditions = [
    action ? eq(schema.auditLogs.action, action) : undefined,
    targetType ? eq(schema.auditLogs.targetType, targetType) : undefined,
    actorId ? eq(schema.auditLogs.actorId, actorId) : undefined,
    q ? like(schema.auditLogs.action, `%${q}%`) : undefined,
  ].filter(Boolean) as any[]
  const where = conditions.length ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.auditLogs)
    .where(where) as [{ total: number }]

  const items = await db.query.auditLogs.findMany({
    where,
    orderBy: desc(schema.auditLogs.createdAt),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  const actorIds = items.map(i => i.actorId).filter(Boolean) as string[]
  const actors = actorIds.length
    ? await db.select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
      }).from(schema.users).where(inArray(schema.users.id, actorIds))
    : []
  const actorMap = new Map(actors.map(u => [u.id, u]))

  return {
    items: items.map(i => toAdminAuditLogItem(i, i.actorId ? (actorMap.get(i.actorId) ?? null) : null)),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
})
