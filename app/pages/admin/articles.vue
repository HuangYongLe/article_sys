<script setup lang="ts">
import type { AdminArticleListResult, AdminArticleListItem, ArticleStatus, ArticleVisibility } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const toast = useToast()

const statusFilter = ref<ArticleStatus | 'all'>('all')
const visibilityFilter = ref<ArticleVisibility | 'all'>('all')
const authorSearch = ref('')
const q = ref('')
const page = ref(1)
const pageSize = 15

const data = ref<AdminArticleListResult | null>(null)
const loading = ref(false)

const tabs: { value: ArticleStatus | 'all', label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '已归档' },
]

const statusMeta: Record<ArticleStatus, { label: string, color: any }> = {
  draft: { label: '草稿', color: 'neutral' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' },
}
const visibilityMeta: Record<ArticleVisibility, { label: string, color: any }> = {
  public: { label: '公开', color: 'success' },
  private: { label: '已下架', color: 'error' },
}

const counts = computed(() => data.value?.counts ?? { draft: 0, published: 0, archived: 0 })
const total = computed(() => data.value?.meta.total ?? 0)
// 「全部」标签固定显示的总数（不受 status 筛选影响）
const grandTotal = computed(() => data.value?.grandTotal ?? total.value)

const visibilityOptions = [
  { label: '全部可见性', value: 'all' },
  { label: '公开', value: 'public' },
  { label: '已下架', value: 'private' },
]

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<AdminArticleListResult>('/api/admin/articles', {
      query: {
        status: statusFilter.value === 'all' ? undefined : statusFilter.value,
        visibility: visibilityFilter.value === 'all' ? undefined : visibilityFilter.value,
        author: authorSearch.value.trim() || undefined,
        q: q.value.trim() || undefined,
        page: page.value,
        pageSize,
      },
    })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.message ?? '加载失败', color: 'error' })
  }
  finally {
    loading.value = false
  }
}

function setStatus(v: ArticleStatus | 'all') {
  statusFilter.value = v
  page.value = 1
  load()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([authorSearch, q], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})
watch(page, () => load())
watch(visibilityFilter, () => { page.value = 1; load() })

// ---------- 批量选择 ----------
const selected = ref<Set<string>>(new Set())
const allSelected = computed({
  get() {
    const items = data.value?.items ?? []
    return items.length > 0 && items.every(a => selected.value.has(a.id))
  },
  set(v: boolean) {
    const items = data.value?.items ?? []
    const next = new Set(selected.value)
    for (const a of items) {
      if (v) next.add(a.id)
      else next.delete(a.id)
    }
    selected.value = next
  },
})
function toggle(a: AdminArticleListItem) {
  const next = new Set(selected.value)
  if (next.has(a.id)) next.delete(a.id)
  else next.add(a.id)
  selected.value = next
}
function toggleAll(v: boolean) {
  allSelected.value = v
}
const selectedCount = computed(() => selected.value.size)

const bulkLoading = ref(false)
async function bulk(action: 'hide' | 'show' | 'delete') {
  if (selectedCount.value === 0) return
  bulkLoading.value = true
  try {
    const res = await $fetch('/api/admin/articles/bulk', {
      method: 'POST',
      body: { ids: [...selected.value], action },
    })
    toast.add({ title: `已${action === 'delete' ? '删除' : action === 'hide' ? '下架' : '公开'} ${res.count} 篇`, color: 'success' })
    selected.value = new Set()
    await load()
  }
  catch (e: any) {
    toast.add({ title: e?.data?.message ?? '操作失败', color: 'error' })
  }
  finally {
    bulkLoading.value = false
  }
}

// ---------- 单行审核 ----------
const modOpen = ref(false)
const modTarget = ref<AdminArticleListItem | null>(null)
const modStatus = ref<ArticleStatus>('published')
const modVisibility = ref<ArticleVisibility>('public')
const modNote = ref('')
const modSaving = ref(false)

function openModerate(a: AdminArticleListItem) {
  modTarget.value = a
  modStatus.value = a.status
  modVisibility.value = a.visibility
  modNote.value = a.moderationNote ?? ''
  modOpen.value = true
}
async function saveModerate() {
  if (!modTarget.value) return
  modSaving.value = true
  try {
    await $fetch(`/api/admin/articles/${modTarget.value.id}/moderate`, {
      method: 'POST',
      body: { status: modStatus.value, visibility: modVisibility.value, note: modNote.value || undefined },
    })
    toast.add({ title: '审核已保存', color: 'success' })
    modOpen.value = false
    await load()
  }
  catch (e: any) {
    toast.add({ title: e?.data?.message ?? '保存失败', color: 'error' })
  }
  finally {
    modSaving.value = false
  }
}

// ---------- 删除 ----------
const delTarget = ref<AdminArticleListItem | null>(null)
async function confirmDelete() {
  if (!delTarget.value) return
  try {
    await $fetch('/api/admin/articles/bulk', { method: 'POST', body: { ids: [delTarget.value.id], action: 'delete' } })
    toast.add({ title: '文章已删除', color: 'success' })
    delTarget.value = null
    await load()
  }
  catch (e: any) {
    toast.add({ title: e?.data?.message ?? '删除失败', color: 'error' })
  }
}

function fmt(ts: number | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}

onMounted(load)
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div>
      <h1 class="text-2xl font-semibold">文章管理</h1>
      <p class="text-sm text-muted">审核内容、调整公开/下架状态、处置违规文章</p>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="t in tabs"
          :key="t.value"
          size="sm"
          :variant="statusFilter === t.value ? 'solid' : 'soft'"
          :color="t.value === 'published' ? 'success' : 'neutral'"
          @click="setStatus(t.value)"
        >
          {{ t.label }}
          <UBadge
            v-if="t.value === 'all' ? grandTotal : counts[t.value as ArticleStatus]"
            :color="t.value === 'published' ? 'success' : 'neutral'"
            :variant="statusFilter === t.value ? 'solid' : 'soft'"
            class="ml-1 tabular-nums"
          >
            {{ t.value === 'all' ? grandTotal : counts[t.value as ArticleStatus] }}
          </UBadge>
        </UButton>
      </div>
      <USelect v-model="visibilityFilter" :items="visibilityOptions" size="sm" class="w-36" />
      <UInput v-model="authorSearch" icon="i-lucide-user" placeholder="作者用户名" size="sm" class="w-40" />
      <UInput v-model="q" icon="i-lucide-search" placeholder="搜索标题 / 摘要" size="sm" class="ml-auto w-64 max-w-full" />
    </div>

    <!-- 批量操作条 -->
    <UCard v-if="selectedCount > 0" class="border-primary/50">
      <div class="flex items-center gap-3">
        <span class="text-sm">已选 {{ selectedCount }} 篇</span>
        <div class="flex gap-2 ml-auto">
          <UButton size="xs" color="error" variant="soft" :loading="bulkLoading" @click="bulk('hide')">批量下架</UButton>
          <UButton size="xs" color="success" variant="soft" :loading="bulkLoading" @click="bulk('show')">批量公开</UButton>
          <UButton size="xs" color="error" :loading="bulkLoading" @click="bulk('delete')">批量删除</UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <div v-if="loading && !data" class="py-12 text-center text-muted">加载中…</div>
      <div v-else-if="!data || data.items.length === 0" class="py-12 text-center text-muted">暂无文章</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted border-b border-default">
            <th class="py-2 pr-2 w-8"><UCheckbox :model-value="allSelected" @update:model-value="toggleAll" /></th>
            <th class="py-2 pr-3 font-medium">文章</th>
            <th class="py-2 pr-3 font-medium">作者</th>
            <th class="py-2 pr-3 font-medium">状态</th>
            <th class="py-2 pr-3 font-medium">可见性</th>
            <th class="py-2 pr-3 font-medium">更新时间</th>
            <th class="py-2 pr-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in data.items" :key="a.id" class="border-b border-default/60" :class="selected.has(a.id) ? 'bg-primary/5' : ''">
            <td class="py-3 pr-2"><UCheckbox :model-value="selected.has(a.id)" @update:model-value="() => toggle(a)" /></td>
            <td class="py-3 pr-3">
              <div class="flex items-center gap-2 min-w-0">
                <img v-if="a.coverUrl" :src="a.coverUrl" alt="" class="w-10 h-8 rounded object-cover shrink-0" />
                <div class="min-w-0">
                  <NuxtLink :to="`/u/${a.authorUsername}/${a.slug}`" class="font-medium truncate hover:text-primary block max-w-[260px]">{{ a.title }}</NuxtLink>
                  <div v-if="a.moderationNote" class="text-xs text-warning truncate max-w-[260px]">备注：{{ a.moderationNote }}</div>
                </div>
              </div>
            </td>
            <td class="py-3 pr-3">
              <div class="flex items-center gap-1.5">
                <UAvatar :src="a.authorAvatarUrl || ''" :alt="a.authorDisplayName" size="xs" />
                <span class="truncate max-w-[100px]">@{{ a.authorUsername }}</span>
              </div>
            </td>
            <td class="py-3 pr-3"><UBadge :color="statusMeta[a.status].color" variant="subtle">{{ statusMeta[a.status].label }}</UBadge></td>
            <td class="py-3 pr-3"><UBadge :color="visibilityMeta[a.visibility].color" variant="subtle">{{ visibilityMeta[a.visibility].label }}</UBadge></td>
            <td class="py-3 pr-3 text-muted">{{ fmt(a.updatedAt) }}</td>
            <td class="py-3 pr-3">
              <div class="flex justify-end gap-1">
                <UButton size="xs" variant="soft" @click="openModerate(a)">审核</UButton>
                <UButton size="xs" color="error" variant="soft" @click="delTarget = a">删除</UButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="data && data.meta.totalPages > 1" class="flex items-center justify-end gap-2 pt-4">
        <UButton size="xs" variant="soft" :disabled="page <= 1" @click="page--">上一页</UButton>
        <span class="text-xs text-muted">第 {{ data.meta.page }} / {{ data.meta.totalPages }} 页</span>
        <UButton size="xs" variant="soft" :disabled="page >= data.meta.totalPages" @click="page++">下一页</UButton>
      </div>
    </UCard>

    <!-- 审核弹窗 -->
    <UModal v-model:open="modOpen" :title="`审核：${modTarget?.title ?? ''}`">
      <template #body>
        <div class="space-y-5">
          <!-- 文章信息 -->
          <div class="rounded-xl bg-elevated ring-1 ring-default divide-y divide-default">
            <div class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span class="text-muted">作者</span>
              <span class="font-medium text-highlighted truncate">@{{ modTarget?.authorUsername }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span class="text-muted">当前状态</span>
              <UBadge :color="statusMeta[modTarget?.status ?? 'draft'].color" variant="subtle">
                {{ statusMeta[modTarget?.status ?? 'draft'].label }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span class="text-muted">可见性</span>
              <UBadge :color="visibilityMeta[modTarget?.visibility ?? 'public'].color" variant="subtle">
                {{ visibilityMeta[modTarget?.visibility ?? 'public'].label }}
              </UBadge>
            </div>
          </div>

          <!-- 表单 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-highlighted">状态</label>
              <USelect v-model="modStatus" :items="[
                { label: '草稿', value: 'draft' },
                { label: '已发布', value: 'published' },
                { label: '已归档', value: 'archived' },
              ]" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-highlighted">可见性</label>
              <USelect v-model="modVisibility" :items="[
                { label: '公开', value: 'public' },
                { label: '已下架', value: 'private' },
              ]" />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-highlighted">审核备注（可选）</label>
            <UTextarea v-model="modNote" :rows="3" placeholder="如违规原因、处理说明，将记录在审计日志" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="soft" color="neutral" @click="modOpen = false">取消</UButton>
          <UButton color="primary" :loading="modSaving" @click="saveModerate">保存</UButton>
        </div>
      </template>
    </UModal>

    <!-- 删除确认 -->
    <UModal :open="!!delTarget" @update:open="v => !v && (delTarget = null)">
      <template #content>
        <UCard>
          <template #header><h3 class="font-semibold">删除文章</h3></template>
          <p>确定删除「{{ delTarget?.title }}」吗？此操作不可撤销，关联标签关系一并清除。</p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="delTarget = null">取消</UButton>
              <UButton color="error" @click="confirmDelete">删除</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
