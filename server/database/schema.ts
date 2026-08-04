import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core'

const nowSec = sql`(unixepoch())`

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull(),
  email: text('email'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['super_admin', 'author'] }).notNull().default('author'),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  status: text('status', { enum: ['pending', 'active', 'disabled', 'rejected'] }).notNull().default('active'),
  // 审核信息：自助注册账号需超管审核通过（status=pending → active）后方可登录
  approvedBy: text('approved_by'),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  rejectionReason: text('rejection_reason'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  tokenVersion: integer('token_version').notNull().default(0),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(nowSec),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(nowSec).$onUpdate(() => new Date()),
}, t => [
  uniqueIndex('users_username_unique').on(t.username),
  uniqueIndex('users_email_unique').on(t.email),
  index('users_role_status_idx').on(t.role, t.status),
])

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  summary: text('summary'),
  content: text('content').notNull().default(''),
  contentHtml: text('content_html'),
  coverUrl: text('cover_url'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  visibility: text('visibility', { enum: ['public', 'private'] }).notNull().default('public'),
  moderatedBy: text('moderated_by').references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: integer('moderated_at', { mode: 'timestamp' }),
  moderationNote: text('moderation_note'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  viewCount: integer('view_count').notNull().default(0),
  wordCount: integer('word_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(nowSec),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(nowSec).$onUpdate(() => new Date()),
}, t => [
  uniqueIndex('articles_author_slug_unique').on(t.authorId, t.slug),
  index('articles_author_updated_idx').on(t.authorId, t.status, t.updatedAt),
  index('articles_feed_idx').on(t.status, t.visibility, t.publishedAt),
  index('articles_updated_idx').on(t.updatedAt),
])

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(nowSec),
}, t => [uniqueIndex('tags_owner_slug_unique').on(t.ownerId, t.slug)])

export const articleTags = sqliteTable('article_tags', {
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, t => [
  primaryKey({ columns: [t.articleId, t.tagId] }),
  index('article_tags_tag_idx').on(t.tagId),
])

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(nowSec),
}, t => [
  index('audit_target_idx').on(t.targetType, t.targetId),
  index('audit_created_idx').on(t.createdAt),
])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type Tag = typeof tags.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
