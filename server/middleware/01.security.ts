/** 全局安全响应头 */
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })

  // API 响应禁止被中间层缓存（公开页 SSR 缓存由 routeRules 单独控制）
  if (event.path.startsWith('/api/')) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
  }
})
