import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { nanoid } from 'nanoid'
import { requireAuthor } from '../../utils/auth'

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * 头像上传：本地开发写 public/uploads/；生产走 Vercel Blob（private store）。
 * 返回同源代理路径 /api/blob/avatars/...，由代理用签名 URL 转发，访客可见。
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuthor(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.data?.length)
  if (!file || !file.type) {
    throw createError({ statusCode: 400, message: '请选择要上传的图片' })
  }
  const ext = ALLOWED.get(file.type)
  if (!ext) {
    throw createError({ statusCode: 400, message: '仅支持 JPG / PNG / WebP / GIF' })
  }
  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: '头像图片不能超过 2MB' })
  }

  const filename = `avatars/${user.id}/${nanoid(12)}.${ext}`

  if (import.meta.dev) {
    const dir = join(process.cwd(), 'public', 'uploads', 'avatars', user.id)
    await mkdir(dir, { recursive: true })
    const name = filename.split('/').pop()!
    await writeFile(join(dir, name), file.data)
    return { url: `/api/blob/${filename}` }
  }

  const { put } = await import('@vercel/blob')
  await put(filename, file.data, {
    // store 为 private：上传必须声明 private，否则抛
    // "Cannot use public access on a private store"
    access: 'private',
    contentType: file.type,
  })
  // 返回同源代理路径；生产私有 blob 由 /api/blob/[...] 用签名 URL 转发，
  // 这样头像对访客可见，又不必把整个 store 设为 public。
  return { url: `/api/blob/${filename}` }
})
