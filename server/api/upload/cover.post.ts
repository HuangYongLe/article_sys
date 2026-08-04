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
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * 封面上传：本地开发写 public/uploads/；生产走 Vercel Blob。
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
    throw createError({ statusCode: 400, message: '图片不能超过 5MB' })
  }

  const filename = `covers/${user.id}/${nanoid(12)}.${ext}`

  if (import.meta.dev) {
    const dir = join(process.cwd(), 'public', 'uploads', 'covers', user.id)
    await mkdir(dir, { recursive: true })
    const name = filename.split('/').pop()!
    await writeFile(join(dir, name), file.data)
    return { url: `/uploads/covers/${user.id}/${name}` }
  }

  const { put } = await import('@vercel/blob')
  const blob = await put(filename, file.data, {
    access: 'public',
    contentType: file.type,
  })
  return { url: blob.url }
})
