import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

// Vercel 的 nft 静态追踪追不到 @libsql 按平台动态 require 的原生二进制
// （代码里是 require(`@libsql/${target}`)），导致 serverless 函数缺 .node。
// 解决办法：把 @libsql/client / libsql 设为 external，nft 会把它们整包连同
// 嵌套的原生平台包一起复制进函数 bundle 的 node_modules；同时用 traceInclude
// 强制把已安装的原生包打进函数包。注意：traceInclude 必须给“真实存在的路径”
// （相对项目根的 node_modules 路径），不能给裸模块名——nft 会把裸名当成相对
// 根目录的路径去读而找不到文件。这里按当前构建平台动态挑已安装的原生包，
// 同时兼顾“顶层 node_modules/@libsql”和“被 npm 嵌套到
// node_modules/libsql/node_modules/@libsql”两种情况。
// 关键点：Vercel 上常常 npm 只创建了原生包目录却未落地文件（空目录），若把这种
// 空目录传给 traceInclude，nft 会直接报 “File .../@libsql/linux-x64-gnu does not exist”
// 使整次构建失败。因此这里只收录“确实含 package.json”的目录；缺失的原生包由
// scripts/ensure-libsql-native.mjs（postinstall）在 Linux 构建时强制补齐。
const libsqlNativeCandidates = [
  join(process.cwd(), 'node_modules/@libsql'),
  join(process.cwd(), 'node_modules/libsql/node_modules/@libsql'),
]
const libsqlNativeInclude = libsqlNativeCandidates
  .filter(existsSync)
  .flatMap((dir) =>
    readdirSync(dir)
      .filter((d) => /^(linux-|win32-|darwin-|freebsd-)/.test(d))
      // 只收录真正含有 package.json 的原生包目录，跳过 Vercel 上的空目录
      .filter((d) => existsSync(join(dir, d, 'package.json')))
      .map((d) => relative(process.cwd(), join(dir, d))),
  )

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui', 'nuxt-auth-utils', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/image'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || '文章发布平台',
    },
  },
  // ---------- 图片优化：响应式 + 现代格式 + 懒加载 ----------
  image: {
    format: ['webp', 'avif'],
    quality: 80,
    screens: [320, 640, 768, 1024, 1280, 1536],
    domains: ['blob.vercel-storage.com', '*.public.blob.vercel-storage.com'],
  },
  nitro: {
    externals: {
      external: ['@libsql/client', '@libsql/client/node', 'libsql', '@resvg/resvg-wasm'],
      // 强制把当前平台已安装的原生包打进函数包（路径为真实存在的 node_modules 路径，
      // 见上方 libsqlNativeInclude 计算）。Vercel(Linux x64) 会带上 @libsql/linux-x64-gnu，
      // 本地 Windows 构建带上 win32-x64-msvc；运行时 libsql 的 require(`@libsql/${target}`)
      // 能在 bundle 的 node_modules 里解析到原生 .node。
      traceInclude: libsqlNativeInclude,
    },
    // ---------- SSG：摘要/聚合结果页预渲染 ----------
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor',
      ],
    },
  },
  routeRules: {
    '/dashboard/**': { ssr: false },
    '/admin/**': { ssr: false },
    // 公开聚合/摘要页与作者/文章详情页：静态预渲染（SSG）
    '/': { prerender: true },
    '/u/**': { prerender: true },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#16a34a' },
        { name: 'color-scheme', content: 'dark light' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
      ],
    },
  },
  typescript: { strict: true, typeCheck: false },
})
