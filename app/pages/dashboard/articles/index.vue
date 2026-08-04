<script setup lang="ts">
import type { ArticleDTO, MyArticleListResult } from '#shared/types'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const toast = useToast()

const page = ref(1)
const pageSize = 10
const status = ref<'all' | 'draft' | 'published' | 'archived'>('all')
const q = ref('')
const qDebounced = refDebounced(q, 300)

const { data, refresh, pending } = await useAsyncData(
  'my-articles',
  () => $fetch<MyArticleListResult>('/api/articles', {
    query: {
      page: page.value,
      pageSize,
      status: status.value === 'all' ? undefined : status.value,
      q: qDebounced.value || undefined,
    },
  }),
  { watch: [page, status, qDebounced] },
)

watch([status, qDebounced], () => { page.value = 1 })

const counts = computed(() => data.value?.counts)
const totalCount = computed(() =>
  counts.value ? counts.value.draft + counts.value.published + counts.value.archived : undefined,
)
const mkBadge = (n?: number) =>
  n === undefined ? undefined : { label: n, variant: 'soft' as const, color: 'neutral' as const }

const statusTabs = computed(() => [
  { label: '全部', value: 'all', badge: mkBadge(totalCount.value) },
  { label: '草稿', value: 'draft', badge: mkBadge(counts.value?.draft) },
  { label: '已发布', value: 'published', badge: mkBadge(counts.value?.published) },
  { label: '已归档', value: 'archived', badge: mkBadge(counts.value?.archived) },
])

const statusMeta: Record<string, { label: string, color: 'neutral' | 'success' | 'warning' }> = {
  draft: { label: '草稿', color: 'neutral' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' },
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}

async function doAction(article: ArticleDTO, action: 'publish' | 'unpublish' | 'archive') {
  try {
    await $fetch(`/api/articles/${article.id}/status`, { method: 'POST', body: { action } })
    toast.add({ title: { publish: '已发布', unpublish: '已转为草稿', archive: '已归档' }[action], color: 'success' })
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '操作失败', color: 'error' })
  }
}

const deleting = ref<ArticleDTO | null>(null)
async function confirmDelete() {
  if (!deleting.value) return
  try {
    await $fetch(`/api/articles/${deleting.value.id}`, { method: 'DELETE' })
    toast.add({ title: '文章已删除', color: 'success' })
    deleting.value = null
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '删除失败', color: 'error' })
  }
}

function rowMenu(article: ArticleDTO) {
  return [
    [
      { label: '编辑', icon: 'i-lucide-pencil', to: `/dashboard/articles/${article.id}` },
      ...(article.status !== 'published'
        ? [{ label: '发布', icon: 'i-lucide-send', onSelect: () => doAction(article, 'publish') }]
        : [{ label: '转为草稿', icon: 'i-lucide-undo-2', onSelect: () => doAction(article, 'unpublish') }]),
      ...(article.status !== 'archived'
        ? [{ label: '归档', icon: 'i-lucide-archive', onSelect: () => doAction(article, 'archive') }]
        : []),
    ],
    [{ label: '删除', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => { deleting.value = article } }],
  ]
}
</script>

<template>
  <div class="p-6 space-y-4 max-w-5xl mx-auto">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">我的文章</h1>
      <UButton to="/dashboard/articles/new" icon="i-lucide-plus">写文章</UButton>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <UTabs
        v-model="status"
        :items="statusTabs"
        :content="false"
        size="sm"
      />
      <UInput v-model="q" icon="i-lucide-search" placeholder="搜索标题…" size="sm" class="ml-auto w-56" />
    </div>

    <UCard v-if="pending && !data" class="py-16 text-center text-muted">加载中…</UCard>

    <UCard v-else-if="!data?.items.length" class="py-16 text-center">
      <UIcon name="i-lucide-file-text" class="size-10 text-dimmed mx-auto mb-2" />
      <p class="text-muted">还没有文章，点右上角「写文章」开始创作</p>
    </UCard>

    <div v-else class="space-y-2">
      <UCard v-for="a in data.items" :key="a.id" :ui="{ body: 'p-4 sm:p-4' }">
        <div class="flex items-center gap-4">
          <img
            v-if="a.coverUrl"
            :src="a.coverUrl"
            alt=""
            class="w-16 h-12 rounded object-cover shrink-0"
          >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <NuxtLink :to="`/dashboard/articles/${a.id}`" class="font-medium truncate hover:text-primary">
                {{ a.title }}
              </NuxtLink>
              <UBadge :color="statusMeta[a.status]!.color" variant="subtle" size="sm">
                {{ statusMeta[a.status]!.label }}
              </UBadge>
              <UBadge v-if="a.visibility === 'private'" color="error" variant="subtle" size="sm">
                已被下架
              </UBadge>
            </div>
            <p class="text-sm text-muted truncate mt-0.5">
              /{{ a.slug }} · 更新于 {{ fmtDate(a.updatedAt) }}
            </p>
          </div>
          <UDropdownMenu :items="rowMenu(a)">
            <UButton icon="i-lucide-ellipsis" variant="ghost" color="neutral" />
          </UDropdownMenu>
        </div>
      </UCard>

      <div v-if="data.meta.totalPages > 1" class="flex justify-center pt-2">
        <UPagination v-model:page="page" :total="data.meta.total" :items-per-page="pageSize" />
      </div>
    </div>

    <UModal :open="!!deleting" @update:open="v => !v && (deleting = null)">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold">删除文章</h3>
          </template>
          <p>确定删除「{{ deleting?.title }}」吗？此操作不可撤销。</p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="deleting = null">取消</UButton>
              <UButton color="error" @click="confirmDelete">删除</UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
