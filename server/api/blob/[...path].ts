import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { issueSignedToken, presignUrl } from '@vercel/blob'

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

// 进程内缓存已签发的读 URL，避免每个请求都调用 issueSignedToken。
// 签名有效期 1h，这里缓存 50min，留 10min 余量。
const SIGNED_TTL_MS = 50 * 60 * 1000
const signedCache = new Map<string, { url: string, exp: number }>()

/**
 * 封面图代理：
 * - dev 下直接读 public/uploads/<path>（与上传写入路径一致）。
 * - 生产（private Blob store）下用 BLOB_READ_WRITE_TOKEN 签发限时读 URL
 *   并 302 跳转到 Blob CDN，浏览器据此直接拉取图片（同源 <img> 即可）。
 */
export default defineEventHandler(async (event) => {
  const segs = event.context.params?.path
  const path = Array.isArray(segs) ? segs.join('/') : (segs || '')
  if (!path || !(path.startsWith('covers/') || path.startsWith('avatars/'))) {
    throw createError({ statusCode: 400, message: 'Invalid blob path' })
  }

  if (import.meta.dev) {
    const file = join(process.cwd(), 'public', 'uploads', path)
    try {
      const buf = await readFile(file)
      const ext = path.split('.').pop()?.toLowerCase() || ''
      setResponseHeader(event, 'content-type', MIME[ext] || 'application/octet-stream')
      setResponseHeader(event, 'cache-control', 'public, max-age=86400')
      return buf
    }
    catch {
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw createError({ statusCode: 500, message: 'BLOB_READ_WRITE_TOKEN is not configured' })
  }

  const now = Date.now()
  let signed = signedCache.get(path)
  if (!signed || signed.exp <= now) {
    const validUntil = now + 60 * 60 * 1000 // 1h
    const signedToken = await issueSignedToken({
      pathname: path,
      operations: ['get'],
      validUntil,
      token,
    })
    const { presignedUrl } = await presignUrl(signedToken, {
      pathname: path,
      operation: 'get',
      access: 'private',
    })
    signed = { url: presignedUrl, exp: now + SIGNED_TTL_MS }
    signedCache.set(path, signed)
  }

  return sendRedirect(event, signed.url, 302)
})
