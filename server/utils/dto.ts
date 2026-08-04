import type { Article, User, AuditLog } from '../database/schema'
import type {
  ArticleDTO,
  PublicAuthor,
  PublicArticleListItem,
  PublicArticleDetail,
  AdminArticleListItem,
  AdminAuditLogItem,
} from '#shared/types'

export function toArticleDTO(a: Article, tagIds: string[] = []): ArticleDTO {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    content: a.content,
    coverUrl: a.coverUrl,
    status: a.status,
    visibility: a.visibility,
    moderationNote: a.moderationNote,
    publishedAt: a.publishedAt?.getTime() ?? null,
    viewCount: a.viewCount,
    createdAt: a.createdAt.getTime(),
    updatedAt: a.updatedAt.getTime(),
    tagIds,
    authorId: a.authorId,
  }
}

// ---------- 公开页 DTO ----------

export function toPublicAuthor(u: Pick<User, 'username' | 'displayName' | 'avatarUrl' | 'bio'>): PublicAuthor {
  return {
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio ?? null,
  }
}

export function toPublicArticleListItem(
  a: Article,
  author: PublicAuthor,
  tags: { name: string, slug: string }[],
): PublicArticleListItem {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    coverUrl: a.coverUrl,
    publishedAt: a.publishedAt?.getTime() ?? Date.now(),
    viewCount: a.viewCount,
    wordCount: a.wordCount,
    author,
    tags,
  }
}

export function toPublicArticleDetail(
  a: Article,
  author: PublicAuthor,
  tags: { name: string, slug: string }[],
): PublicArticleDetail {
  return {
    ...toPublicArticleListItem(a, author, tags),
    contentHtml: a.contentHtml ?? '',
  }
}

// ---------- 中控台 DTO ----------

export function toAdminArticleListItem(
  a: Article,
  author: { username: string, displayName: string, avatarUrl: string | null },
  moderatedBy: { username: string } | null,
  tags: { name: string, slug: string }[],
): AdminArticleListItem {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    coverUrl: a.coverUrl,
    status: a.status,
    visibility: a.visibility,
    moderationNote: a.moderationNote,
    moderatedBy: a.moderatedBy,
    moderatedByUsername: moderatedBy?.username ?? null,
    moderatedAt: a.moderatedAt?.getTime() ?? null,
    publishedAt: a.publishedAt?.getTime() ?? null,
    viewCount: a.viewCount,
    wordCount: a.wordCount,
    authorId: a.authorId,
    authorUsername: author.username,
    authorDisplayName: author.displayName,
    authorAvatarUrl: author.avatarUrl,
    createdAt: a.createdAt.getTime(),
    updatedAt: a.updatedAt.getTime(),
    tags,
  }
}

export function toAdminAuditLogItem(
  log: AuditLog,
  actor: { username: string, displayName: string } | null,
): AdminAuditLogItem {
  return {
    id: log.id,
    actorId: log.actorId,
    actorUsername: actor?.username ?? null,
    actorDisplayName: actor?.displayName ?? null,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    payload: (log.payload as Record<string, unknown> | null) ?? null,
    createdAt: log.createdAt.getTime(),
  }
}
