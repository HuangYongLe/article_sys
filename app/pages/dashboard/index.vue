<script setup lang="ts">
import type { ArticleDTO, Paginated } from '#shared/types'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { user } = useUserSession()

const { data } = await useAsyncData(
  'dashboard-overview',
  () => $fetch<Paginated<ArticleDTO>>('/api/articles', { query: { page: 1, pageSize: 5 } }),
  { server: false },
)

const stats = computed(() => {
  const items = data.value?.items ?? []
  return {
    total: data.value?.meta.total ?? 0,
    published: items.filter(a => a.status === 'published').length,
    drafts: items.filter(a => a.status === 'draft').length,
  }
})
</script>

<template>
  <div class="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">概览</h1>
        <p class="text-muted text-sm mt-1">欢迎回来，{{ user?.displayName }}</p>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="user?.username"
          :to="`/u/${user.username}`"
          target="_blank"
          variant="outline"
          color="neutral"
          icon="i-lucide-external-link"
        >
          我的主页
        </UButton>
        <UButton to="/dashboard/articles/new" icon="i-lucide-plus">写文章</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <UCard>
        <p class="text-sm text-muted">文章总数</p>
        <p class="text-3xl font-bold mt-1">{{ stats.total }}</p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">最近已发布</p>
        <p class="text-3xl font-bold mt-1 text-success">{{ stats.published }}</p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">最近草稿</p>
        <p class="text-3xl font-bold mt-1">{{ stats.drafts }}</p>
      </UCard>
    </div>

    <UCard v-if="data?.items.length">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-medium">最近更新</h2>
          <UButton to="/dashboard/articles" variant="link" size="sm" trailing-icon="i-lucide-arrow-right">
            全部文章
          </UButton>
        </div>
      </template>
      <ul class="divide-y divide-default">
        <li v-for="a in data.items" :key="a.id" class="py-2 flex items-center gap-2">
          <UIcon
            :name="a.status === 'published' ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'"
            :class="a.status === 'published' ? 'text-success' : 'text-dimmed'"
            class="size-4 shrink-0"
          />
          <NuxtLink :to="`/dashboard/articles/${a.id}`" class="truncate hover:text-primary">
            {{ a.title }}
          </NuxtLink>
        </li>
      </ul>
    </UCard>
  </div>
</template>
