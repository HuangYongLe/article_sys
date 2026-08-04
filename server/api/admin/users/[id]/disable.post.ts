import { getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema } from '../../../../utils/db'
import { getManageableUser } from '../../../../utils/admin'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { admin, target } = await getManageableUser(event, id)

  const db = await useDb()
  await db.update(schema.users)
    .set({ status: 'disabled', rejectionReason: null })
    .where(eq(schema.users.id, target.id))

  await logAudit({
    actorId: admin.id,
    action: 'user.disable',
    targetType: 'user',
    targetId: target.id,
    payload: { username: target.username },
  })

  return { ok: true, status: 'disabled' }
})
