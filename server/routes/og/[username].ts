import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../utils/db'
import { renderOgImageCached } from '../../utils/og'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username
  if (!username) {
    throw createError({ statusCode: 404 })
  }

  const db = await useDb()
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
    columns: { id: true, username: true, displayName: true, bio: true, status: true },
  })
  if (!user || user.status !== 'active') {
    throw createError({ statusCode: 404 })
  }

  const articleCount = await db.$count(
    schema.articles,
    and(
      eq(schema.articles.authorId, user.id),
      eq(schema.articles.status, 'published'),
      eq(schema.articles.visibility, 'public'),
    ),
  )

  const png = await renderOgImageCached(`author:${username}`, {
    title: user.displayName,
    subtitle: user.bio ?? undefined,
    brand: useRuntimeConfig().public.siteName,
    meta: `@${user.username} · ${articleCount} 篇文章`,
  })

  setResponseHeaders(event, {
    'content-type': 'image/png',
    'cache-control': 'public, max-age=86400, s-maxage=86400',
    'content-disposition': 'inline',
  })
  return png
})
