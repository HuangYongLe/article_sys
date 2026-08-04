import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../../utils/db'
import { renderOgImageCached } from '../../../utils/og'

export default defineEventHandler(async (event) => {
  const username = event.context.params?.username
  const slug = event.context.params?.slug
  if (!username || !slug) {
    throw createError({ statusCode: 404 })
  }

  const db = await useDb()
  const author = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
    columns: { id: true, username: true, displayName: true, status: true },
  })
  if (!author || author.status !== 'active') {
    throw createError({ statusCode: 404 })
  }

  const article = await db.query.articles.findFirst({
    where: and(
      eq(schema.articles.authorId, author.id),
      eq(schema.articles.slug, slug),
      eq(schema.articles.status, 'published'),
      eq(schema.articles.visibility, 'public'),
    ),
  })
  if (!article) {
    throw createError({ statusCode: 404 })
  }

  const tagRows = await db.select({ name: schema.tags.name })
    .from(schema.articleTags)
    .innerJoin(schema.tags, eq(schema.articleTags.tagId, schema.tags.id))
    .where(eq(schema.articleTags.articleId, article.id))

  const png = await renderOgImageCached(`article:${username}:${slug}`, {
    title: article.title,
    subtitle: article.summary ?? undefined,
    brand: useRuntimeConfig().public.siteName,
    meta: `${author.displayName} · ${article.viewCount} 阅读`,
    tags: tagRows.map(t => t.name),
  })

  setResponseHeaders(event, {
    'content-type': 'image/png',
    'cache-control': 'public, max-age=86400, s-maxage=86400',
    'content-disposition': 'inline',
  })
  return png
})
