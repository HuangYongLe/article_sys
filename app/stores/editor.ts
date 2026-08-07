import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import type { ArticleDTO } from '#shared/types'

interface EditorState {
  id: string | null
  title: string
  slug: string
  summary: string
  content: string
  coverUrl: string | null
  tagIds: string[]
  status: 'draft' | 'published' | 'archived'
  visibility: 'public' | 'private'
  moderationNote: string | null
  loading: boolean
  saving: boolean
  dirty: boolean
  /** 正在写入服务端返回的数据（load/save），期间不标脏 */
  applying: boolean
}

function emptyState(): EditorState {
  return {
    id: null,
    title: '',
    slug: '',
    summary: '',
    content: '',
    coverUrl: null,
    tagIds: [],
    status: 'draft',
    visibility: 'public',
    moderationNote: null,
    loading: false,
    saving: false,
    dirty: false,
    applying: false,
  }
}

export const useEditorStore = defineStore('editor', {
  state: emptyState,

  actions: {
    reset() {
      Object.assign(this, emptyState())
    },

    applyDTO(dto: ArticleDTO) {
      this.applying = true
      this.id = dto.id
      this.title = dto.title
      this.slug = dto.slug
      this.summary = dto.summary ?? ''
      this.content = dto.content
      this.coverUrl = dto.coverUrl
      this.tagIds = dto.tagIds
      this.status = dto.status
      this.visibility = dto.visibility
      this.moderationNote = dto.moderationNote
      this.dirty = false
      // 等本次赋值触发的响应式更新（含标脏 watch）冲刷完成后再解除屏蔽
      nextTick(() => { this.applying = false })
    },

    async load(id: string) {
      this.loading = true
      try {
        const dto = await $fetch<ArticleDTO>(`/api/articles/${id}`)
        this.applyDTO(dto)
      }
      finally {
        this.loading = false
      }
    },

    /** 新建时 POST，已有 id 时 PATCH；返回文章 id */
    async save(): Promise<string> {
      this.saving = true
      try {
        const body = {
          title: this.title.trim(),
          slug: this.slug.trim() || undefined,
          summary: this.summary.trim() || null,
          content: this.content,
          coverUrl: this.coverUrl || null,
          tagIds: this.tagIds,
        }
        const dto = this.id
          ? await $fetch<ArticleDTO>(`/api/articles/${this.id}`, { method: 'PATCH', body })
          : await $fetch<ArticleDTO>('/api/articles', { method: 'POST', body })
        this.applyDTO(dto)
        return dto.id
      }
      finally {
        this.saving = false
      }
    },

    async setStatus(action: 'publish' | 'unpublish' | 'archive') {
      if (!this.id) return
      const dto = await $fetch<ArticleDTO>(`/api/articles/${this.id}/status`, {
        method: 'POST',
        body: { action },
      })
      this.status = dto.status
    },

    async uploadCover(file: File) {
      const form = new FormData()
      form.append('file', file)
      const { url } = await $fetch<{ url: string }>('/api/upload/cover', { method: 'POST', body: form })
      this.coverUrl = url
      this.dirty = true
    },
  },
})
