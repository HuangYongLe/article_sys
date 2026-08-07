// libSQL 原生二进制在 Vercel 上由 nft 静态追踪极不稳定（构建缓存 / 可选依赖落地
// 时机都会导致 buildEnd 报 “File .../@libsql/linux-x64-gnu does not exist”）。
// 根治：不把原生包塞进 traceInclude，而是把 @libsql 整条链路标记为 external，
// 由 Vercel 安装阶段落到函数 bundle 的 node_modules 里、运行时再解析。
// 生产若配置了 TURSO_DATABASE_URL，db.ts 会走纯 JS 的 @libsql/client/web，
// 根本不依赖任何原生 .node 二进制，最为稳妥。

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui', 'nuxt-auth-utils', '@pinia/nuxt', '@vueuse/nuxt', '@nuxt/image'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
    // Bearer Token 签名密钥：优先 AUTH_TOKEN_SECRET，否则复用会话密码（NUXT_SESSION_PASSWORD）
    authTokenSecret: process.env.AUTH_TOKEN_SECRET || '',
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
      // 把 libsql 整条链路 + resvg 标为 external：nft 不打包它们，运行时从函数
      // bundle 的 node_modules 解析（Vercel 安装阶段会带原生可选依赖）。
      external: [
        '@libsql/client',
        '@libsql/client/node',
        '@libsql/client/web',
        'libsql',
        '@resvg/resvg-wasm',
      ],
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
