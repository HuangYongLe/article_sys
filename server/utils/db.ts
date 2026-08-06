import type { Client } from '@libsql/client'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from '../database/schema'

export { schema }

let _db: LibSQLDatabase<typeof schema> | null = null
let _initializing: Promise<LibSQLDatabase<typeof schema>> | null = null

async function createClientForEnv(): Promise<Client> {
  const config = useRuntimeConfig()
  const url = config.tursoDatabaseUrl
  const isLocalFile = url.startsWith('file:') || url === ':memory:'
  // 预渲染（nuxt generate）阶段也在本地用 node 客户端直连 SQLite 文件，
  // 以便把公开聚合/作者/文章页静态化；真实 Serverless 生产仍走 Turso。
  const isPrerender = import.meta.prerender === true || process.env.NITRO_PRERENDER === 'true'

  if (isLocalFile && (import.meta.dev || isPrerender)) {
    // 本地开发 / 预渲染：node 客户端直连 SQLite 文件
    const { createClient } = await import('@libsql/client/node')
    const client = createClient({ url })
    await client.execute('PRAGMA foreign_keys = ON')
    return client
  }

  if (isLocalFile) {
    // 生产但仍是 file: URL（未配置 TURSO_DATABASE_URL）时的兜底：
    // Vercel 等 Serverless 的文件系统只读，只有 /tmp 可写，用其下的本地库让站点
    // 至少能跑通（单实例、冷启动会重置，仅演示级）。生产请配置 TURSO_DATABASE_URL。
    if (process.env.VERCEL) {
      const { createClient } = await import('@libsql/client/node')
      const client = createClient({ url: 'file:/tmp/local.db' })
      await client.execute('PRAGMA foreign_keys = ON')
      console.warn('[db] 使用 /tmp/local.db（Vercel 演示兜底），生产请配置 TURSO_DATABASE_URL 指向 Turso。')
      return client
    }
    throw new Error('[db] 生产构建不支持 file: URL，请配置 TURSO_DATABASE_URL 指向 Turso 数据库')
  }

  // 生产：web 客户端（纯 HTTP，无原生二进制依赖，Serverless 安全）
  const { createClient } = await import('@libsql/client/web')
  const client = createClient({ url, authToken: config.tursoAuthToken || undefined })
  await client.execute('PRAGMA foreign_keys = ON')
  return client
}

/** 模块级单例：Serverless 实例复用连接，避免每请求 TLS 握手 */
export async function useDb(): Promise<LibSQLDatabase<typeof schema>> {
  if (_db) return _db
  if (_initializing) return _initializing
  _initializing = (async () => {
    // 懒加载 drizzle-orm/libsql：避免顶层 import 把 @libsql/client 原生二进制
    // 拉进函数初始化阶段，否则 Serverless 冷启动会因缺失 .node 而
    // FUNCTION_INVOCATION_FAILED（所有 /api 全挂）。改成请求时按需加载，
    // 不碰库的路由（如人机验证）就能正常初始化。
    const { drizzle } = await import('drizzle-orm/libsql')
    _db = drizzle(await createClientForEnv(), { schema, logger: import.meta.dev })
    return _db
  })()
  return _initializing
}
