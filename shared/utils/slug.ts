import slugify from 'slugify'

/** 标题 → slug。中文/emoji 等 slugify 不了的字符会被移除，可能返回空串（调用方需兜底） */
export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 80)
}

/** username / slug 合法性：小写字母数字连字符，3-40 位，不以连字符开头结尾 */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/

/** 公开页 URL 保留字，不允许作为 username */
export const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'login', 'logout', 'dashboard', 'u', 'user', 'users',
  '_nuxt', 'assets', 'public', 'authors', 'rss', 'sitemap', 'about',
  'settings', 'setup', 'bootstrap', 'static', 'favicon',
])
