export interface NavItem {
  label: string
  icon: string
  to: string
  /** 该栏目根页（概览），标签不可关闭 */
  home?: boolean
}

export type Section = 'dashboard' | 'admin'

export const dashboardNav: NavItem[] = [
  { label: '概览', icon: 'i-lucide-layout-dashboard', to: '/dashboard', home: true },
  { label: '我的文章', icon: 'i-lucide-file-text', to: '/dashboard/articles' },
  { label: '标签管理', icon: 'i-lucide-tags', to: '/dashboard/tags' },
  { label: '个人设置', icon: 'i-lucide-settings', to: '/dashboard/settings' },
]

export const adminNav: NavItem[] = [
  { label: '概览', icon: 'i-lucide-gauge', to: '/admin', home: true },
  { label: '用户管理', icon: 'i-lucide-users', to: '/admin/users' },
  { label: '文章管理', icon: 'i-lucide-files', to: '/admin/articles' },
  { label: '审计日志', icon: 'i-lucide-scroll-text', to: '/admin/audit-logs' },
]

export function navFor(section: Section): NavItem[] {
  return section === 'admin' ? adminNav : dashboardNav
}

/**
 * 根据当前路径解析出所属的顶级导航项：
 * - 精确匹配优先
 * - 否则匹配最长前缀（如 /dashboard/articles/new -> /dashboard/articles）
 */
export function resolveNav(section: Section, path: string): NavItem | undefined {
  const nav = navFor(section)
  return nav.find(n => n.to === path) ?? nav.find(n => path.startsWith(n.to + '/'))
}

/** 左侧菜单高亮判断：精确匹配；非根栏目还可匹配其子路由 */
export function isNavActive(item: NavItem, path: string): boolean {
  if (path === item.to) return true
  if (item.home) return false
  return path.startsWith(item.to + '/')
}
