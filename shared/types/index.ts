export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type UserStatus = 'pending' | 'active' | 'disabled' | 'rejected'
export type UserRole = 'super_admin' | 'author'

export interface AdminUserListItem {
  id: string
  username: string
  displayName: string
  email: string | null
  role: UserRole
  status: UserStatus
  avatarUrl: string | null
  approvedBy: string | null
  approvedAt: number | null
  rejectionReason: string | null
  createdAt: number
  lastLoginAt: number | null
}

export interface AdminUserListResult {
  items: AdminUserListItem[]
  meta: PaginationMeta
  counts: Record<UserStatus, number>
  /** 全部状态的总数（不受 status 筛选影响，但随搜索变化），用于「全部」标签固定显示 */
  grandTotal: number
}

export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}

export interface MyArticleListResult {
  items: ArticleDTO[]
  meta: PaginationMeta
  counts: Record<ArticleStatus, number>
}

export interface PublicAuthor {
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
}

export interface PublicArticleListItem {
  id: string
  title: string
  slug: string
  summary: string | null
  coverUrl: string | null
  publishedAt: number
  viewCount: number
  wordCount: number
  author: PublicAuthor
  tags: { name: string, slug: string }[]
}

export interface PublicArticleDetail extends PublicArticleListItem {
  contentHtml: string
}

// ---------- 文章状态 / 可见性 ----------
export type ArticleStatus = 'draft' | 'published' | 'archived'
export type ArticleVisibility = 'public' | 'private'

// ---------- 中控台：文章治理 ----------
export interface AdminArticleListItem {
  id: string
  title: string
  slug: string
  summary: string | null
  coverUrl: string | null
  status: ArticleStatus
  visibility: ArticleVisibility
  moderationNote: string | null
  moderatedBy: string | null
  moderatedByUsername: string | null
  moderatedAt: number | null
  publishedAt: number | null
  viewCount: number
  wordCount: number
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  createdAt: number
  updatedAt: number
  tags: { name: string, slug: string }[]
}

export interface AdminArticleListResult {
  items: AdminArticleListItem[]
  meta: PaginationMeta
  counts: Record<ArticleStatus, number>
  /** 全部状态的总数（不受 status 筛选影响，但随搜索/可见性/作者变化），用于「全部」标签固定显示 */
  grandTotal: number
}

// ---------- 中控台：审计日志 ----------
export interface AdminAuditLogItem {
  id: string
  actorId: string | null
  actorUsername: string | null
  actorDisplayName: string | null
  action: string
  targetType: string
  targetId: string
  payload: Record<string, unknown> | null
  createdAt: number
}

export interface AdminAuditLogListResult {
  items: AdminAuditLogItem[]
  meta: PaginationMeta
}

// ---------- 公开页：标签 / 作者 ----------
export interface PublicTag {
  name: string
  slug: string
  count: number
}

export interface PublicAuthorDetail extends PublicAuthor {
  articleCount: number
}

export interface ArticleDTO {
  id: string
  title: string
  slug: string
  summary: string | null
  content: string
  coverUrl: string | null
  status: 'draft' | 'published' | 'archived'
  visibility: 'public' | 'private'
  moderationNote: string | null
  publishedAt: number | null
  viewCount: number
  createdAt: number
  updatedAt: number
  tagIds: string[]
  authorId: string
}
