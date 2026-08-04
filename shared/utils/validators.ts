import { z } from 'zod'
import { SLUG_RE, RESERVED_USERNAMES } from './slug'

// ---------- 分页 ----------
// 前置定义：被多处查询 schema 复用，必须在使用前声明（否则触发 TDZ）
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

// ---------- 认证 ----------

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, '请输入用户名').max(40),
  password: z.string().min(1, '请输入密码').max(200),
  captchaId: z.string().min(1, '请完成人机验证'),
  captchaAnswer: z.string().min(1, '请完成人机验证'),
}).strict()

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '新密码至少 8 位').max(200),
}).strict()

export const usernameSchema = z.string().trim().toLowerCase()
  .regex(SLUG_RE, '用户名只能包含小写字母、数字和连字符（3-40 位）')
  .refine(v => !RESERVED_USERNAMES.has(v), '该用户名为系统保留字')

export const bootstrapSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, '密码至少 8 位').max(200),
  displayName: z.string().trim().min(1, '请输入显示名').max(50),
}).strict()

/** 自助注册：只允许创建普通作者账号，默认进入待审核状态 */
export const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, '密码至少 8 位').max(200),
  displayName: z.string().trim().min(1, '请输入显示名').max(50),
  email: z.string().trim().toLowerCase().email('邮箱格式不正确').max(200).nullish(),
  captchaId: z.string().min(1, '请完成人机验证'),
  captchaAnswer: z.string().min(1, '请完成人机验证'),
}).strict()

// ---------- 文章 ----------

export const articleUpsertSchema = z.object({
  title: z.string().trim().min(1, '请输入标题').max(200),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, 'slug 格式不合法').optional(),
  summary: z.string().trim().max(500).nullish(),
  content: z.string().max(200_000, '正文过长'),
  coverUrl: z.string().url('封面必须是合法 URL').max(1000).nullish(),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
}).strict()

export const articleStatusSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive']),
}).strict()

export const slugCheckSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, 'slug 格式不合法'),
  excludeId: z.string().uuid().optional(),
}).strict()

// ---------- 个人资料 ----------

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(500).nullish(),
  avatarUrl: z.string().url().max(1000).nullish(),
}).strict()

export const tagCreateSchema = z.object({
  name: z.string().trim().min(1, '请输入标签名').max(30),
}).strict()

// ---------- 中控台 ----------

export const adminUserCreateSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, '密码至少 8 位').max(200),
  displayName: z.string().trim().min(1).max(50),
  email: z.string().email().max(200).nullish(),
  role: z.enum(['super_admin', 'author']).default('author'),
}).strict()

export const adminUserUpdateSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().min(1).max(50).optional(),
  email: z.string().email().max(200).nullish(),
  bio: z.string().trim().max(500).nullish(),
  avatarUrl: z.string().url().max(1000).nullish(),
  role: z.enum(['super_admin', 'author']).optional(),
  status: z.enum(['pending', 'active', 'disabled', 'rejected']).optional(),
}).strict()

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, '密码至少 8 位').max(200),
  mustChangePassword: z.boolean().default(true),
}).strict()

export const rejectSchema = z.object({
  reason: z.string().trim().max(500).nullish(),
}).strict()

export const adminVisibilitySchema = z.object({
  visibility: z.enum(['public', 'private']),
  note: z.string().trim().max(500).nullish(),
}).strict()

export const adminBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['hide', 'show', 'delete']),
}).strict()

// ---------- 中控台：文章治理查询 / 操作 ----------
export const adminArticleQuerySchema = pageQuerySchema.extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  author: z.string().trim().max(40).optional(),
  q: z.string().trim().max(100).optional(),
})

/** 超管审核文章：可改状态、可见性、审核备注（至少一项） */
export const adminArticleModerateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  note: z.string().trim().max(500).nullish(),
}).strict()

// ---------- 中控台：审计日志查询 ----------
export const auditQuerySchema = pageQuerySchema.extend({
  action: z.string().trim().max(60).optional(),
  targetType: z.string().trim().max(30).optional(),
  actor: z.string().trim().max(40).optional(),
  q: z.string().trim().max(100).optional(),
})

// ---------- 公开页查询 ----------
export const publicArticleQuerySchema = pageQuerySchema.extend({
  tag: z.string().trim().toLowerCase().max(40).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['new', 'hot']).default('new'),
})

export const publicAuthorArticlesQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
})
