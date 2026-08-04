import { renderOgImageCached } from '../../utils/og'

export default defineEventHandler(async (event) => {
  const siteName = useRuntimeConfig().public.siteName

  const png = await renderOgImageCached('default', {
    title: siteName,
    subtitle: '发现并分享社区优质文章',
    brand: siteName,
    meta: '最新发布 · 作者专栏 · 标签聚合',
  })

  setResponseHeaders(event, {
    'content-type': 'image/png',
    'cache-control': 'public, max-age=86400, s-maxage=86400',
    'content-disposition': 'inline',
  })
  return png
})
