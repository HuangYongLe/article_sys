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
      // Vercel 的 nft 静态追踪追不到 @libsql / sharp 按平台动态 require 的原生二进制
      // （代码里是 require(`@libsql/${target}`)），会导致 serverless 函数启动缺 .node
      // → FUNCTION_INVOCATION_FAILED（所有 /api/* 含不碰库的 captcha 全 500）。
      // 用 traceInclude 强制把这些平台原生包打进函数包；配合 package.json 的
      // optionalDependencies，Vercel 在 Linux 构建时会先安装对应平台包再打进函数。
      traceInclude: [
        '@libsql/linux-x64-gnu',
        '@libsql/linux-x64-musl',
        '@libsql/linux-arm64-gnu',
        '@libsql/linux-arm64-musl',
        '@img/sharp-linux-x64',
        '@img/sharp-linux-arm64',
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
