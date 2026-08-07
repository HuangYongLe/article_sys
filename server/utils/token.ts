import { createHmac, timingSafeEqual } from 'node:crypto'
import { useRuntimeConfig } from '#imports'
import type { User } from '../database/schema'

/**
 * 移动端 / 小程序 / API 客户端的 Bearer Token 方案。
 *
 * 设计要点：
 * - 与现有 Cookie 会话“并存”：Web 前端继续用加密 Cookie，移动端改用本 Token。
 * - Token 为无状态 HMAC 签名：`base64url(payload).base64url(hmac)`，payload 含
 *   sub(用户 id)、v(tokenVersion)、iat、exp。服务端只验签名 + 查 DB，不落地存储。
 * - 复用 DB 已有的 `tokenVersion`：改密 / 强制下线时递增它即可让所有旧 Token
 *   （以及旧 Cookie）一并失效，无需额外黑名单表。
 * - 密钥：优先读 AUTH_TOKEN_SECRET，否则复用 NUXT_SESSION_PASSWORD（生产已存在）。
 */

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 天

export interface TokenClaims {
  sub: string
  v: number
  iat: number
  exp: number
}

function secret(): string {
  const cfg = useRuntimeConfig()
  const s = (cfg.authTokenSecret as string) || (cfg.sessionPassword as string) || ''
  if (!s) {
    // 开发环境兜底：避免未配置任何密钥导致 HMAC 以空串签名。生产必须设置
    // AUTH_TOKEN_SECRET（或复用 NUXT_SESSION_PASSWORD，nuxt-auth-utils 生产强制要求）。
    if (import.meta.dev) {
      console.warn('[token] 未配置 AUTH_TOKEN_SECRET / NUXT_SESSION_PASSWORD，使用开发兜底密钥，生产请勿如此！')
      return 'dev-only-insecure-token-secret'
    }
    throw createError({ statusCode: 500, message: '服务器未配置 Token 签名密钥' })
  }
  return s
}

export function issueToken(
  user: User,
  ttl: number = DEFAULT_TTL_SECONDS,
): { token: string; expiresIn: number } {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ttl
  const body = Buffer.from(JSON.stringify({ sub: user.id, v: user.tokenVersion, iat, exp })).toString('base64url')
  const sig = createHmac('sha256', secret()).update(body).digest('base64url')
  return { token: `${body}.${sig}`, expiresIn: ttl }
}

/** 校验签名与过期时间；任何异常都返回 null（视为未登录/失效）。 */
export function verifyToken(raw: string): TokenClaims | null {
  const parts = raw.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts

  const expected = createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<TokenClaims>
    if (typeof data.sub !== 'string' || typeof data.v !== 'number') return null
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null
    return { sub: data.sub, v: data.v, iat: data.iat ?? 0, exp: data.exp }
  } catch {
    return null
  }
}
