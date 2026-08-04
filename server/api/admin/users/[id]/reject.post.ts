import { getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { rejectSchema } from '#shared/utils/validators'
import { useDb, schema } from '../../../../utils/db'
import { getManageableUser } from '../../../../utils/admin'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { admin, target } = await getManageableUser(event, id)

  const parsed = rejectSchema.safeParse(await readBody(event))
  const reason = parsed.success ? (parsed.data.reason ?? null) : null

  const db = await useDb()
  await db.update(schema.users)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      approvedBy: null,
      approvedAt: null,
    })
    .where(eq(schema.users.id, target.id))

  await logAudit({
    actorId: admin.id,
    action: 'user.reject',
    targetType: 'user',
    targetId: target.id,
    payload: { username: target.username, reason },
  })

  return { ok: true, status: 'rejected' }
})
