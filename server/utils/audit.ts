import { useDb, schema } from './db'

/**
 * 写审计日志。失败只告警不抛错——审计不应阻断主流程。
 */
export async function logAudit(opts: {
  actorId: string | null
  action: string
  targetType: 'user' | 'article' | 'system'
  targetId: string
  payload?: Record<string, unknown>
}) {
  try {
    const db = await useDb()
    await db.insert(schema.auditLogs).values({
      actorId: opts.actorId,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      payload: opts.payload,
    })
  }
  catch (err) {
    console.error('[audit] 写入失败：', err)
  }
}
