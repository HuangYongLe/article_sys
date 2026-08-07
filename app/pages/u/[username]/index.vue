<script setup lang="ts">
import type { PublicAuthorDetail, PublicArticleListItem } from '#shared/types'

const route = useRoute()
const username = computed(() => route.params.username as string)
const config = useRuntimeConfig()

const { user } = useUserSession()
const isMe = computed(() => !!user.value && user.value.username === username.value)

const { data: author, error } = await useFetch<PublicAuthorDetail>(`/api/public/authors/${username.value}`)
const { data: feed } = await useFetch<{ items: PublicArticleListItem[], meta: { page: number, pageSize: number, total: number, totalPages: number } }>(
  `/api/public/authors/${username.value}/articles`,
  { query: { pageSize: 20 } },
)

useSeoMeta({
  title: () => author.value ? `${author.value.displayName} 的文章` : '作者',
  description: () => author.value?.bio ?? `查看 ${author.value?.displayName ?? username.value} 在平台发布的全部文章。`,
  ogType: 'profile',
  ogTitle: () => author.value ? `${author.value.displayName} 的文章` : '作者',
  ogDescription: () => author.value?.bio ?? `查看 ${author.value?.displayName ?? username.value} 在平台发布的全部文章。`,
  ogUrl: () => `${config.public.siteUrl}/u/${username.value}`,
  ogImage: () => `${config.public.siteUrl}/og/${username.value}`,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageAlt: () => author.value?.displayName ?? '作者',
  twitterCard: 'summary_large_image',
  twitterTitle: () => author.value ? `${author.value.displayName} 的文章` : '作者',
  twitterDescription: () => author.value?.bio ?? '',
  twitterImage: () => `${config.public.siteUrl}/og/${username.value}`,
  robots: 'index, follow',
})

// canonical 必须是 <link rel="canonical">
useHead(() => ({ link: [{ rel: 'canonical', href: `${config.public.siteUrl}/u/${username.value}` }] }))

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
}
</script>

<template>
  <div v-if="author" class="max-w-4xl mx-auto px-4 pb-12 mt-12">
    <!-- Banner -->
    <div class="relative h-36 sm:h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 ring-1 ring-default">
      <div class="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-primary/20 blur-3xl" />
      <div class="pointer-events-none absolute -left-12 bottom-0 size-44 rounded-full bg-primary/10 blur-3xl" />
    </div>

    <!-- Identity -->
    <div class="relative -mt-34 px-4 sm:px-6">
      <div class="flex flex-row items-start gap-4 pt-1">
        <UAvatar :src="author.avatarUrl || ''" :alt="author.displayName" size="3xl" class="ring-4 ring-default bg-default shrink-0" />
        <div class="flex-1 min-w-0 pb-1">
          <h1 class="text-2xl font-bold truncate text-highlighted">{{ author.displayName }}</h1>
          <p class="text-sm text-muted">@{{ author.username }}</p>
        </div>
        <div class="flex gap-2 pb-1" v-if="isMe">
          <UButton to="/dashboard/settings" variant="soft" color="primary" icon="i-lucide-user-cog">编辑资料</UButton>
        </div>
        <div class="flex gap-2 pb-1" v-else>
          <UButton icon="i-lucide-rss" variant="outline" color="neutral">关注</UButton>
        </div>
      </div>

      <p v-if="author.bio" class="mt-3 text-sm text-muted max-w-2xl leading-relaxed">{{ author.bio }}</p>

      <!-- Stats -->
      <div class="mt-4 flex gap-3">
        <div class="flex items-baseline gap-1.5 rounded-xl bg-elevated ring-1 ring-default px-4 py-2">
          <span class="text-xl font-bold text-highlighted tabular-nums">{{ author.articleCount }}</span>
          <span class="text-xs text-muted">篇文章</span>
        </div>
      </div>
    </div>

    <!-- Articles -->
    <div class="mt-8">
      <div class="flex items-center gap-2 mb-4">
        <h2 class="font-semibold text-lg">已发布文章</h2>
        <UBadge variant="soft" color="primary">{{ author.articleCount }}</UBadge>
      </div>

      <UCard v-if="!feed || feed.items.length === 0" class="py-12 text-center text-muted">
        还没有发布的文章
      </UCard>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <UCard
          v-for="a in feed.items"
          :key="a.id"
          :ui="{ body: 'p-0' }"
          class="group overflow-hidden hover:shadow-md hover:ring-primary/40 transition"
        >
          <NuxtLink :to="`/u/${author.username}/${a.slug}`" class="block">
            <div class="flex gap-4 p-4">
              <img v-if="a.coverUrl" :src="a.coverUrl" alt="" width="120" height="80" loading="lazy" decoding="async" class="w-28 h-20 rounded-lg object-cover shrink-0" />
              <div v-else class="w-28 h-20 rounded-lg bg-muted shrink-0 flex items-center justify-center text-dimmed">
                <UIcon name="i-lucide-file-text" class="size-6" />
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition">{{ a.title }}</h3>
                <p class="text-sm text-muted mt-1 line-clamp-2">{{ a.summary || '（无摘要）' }}</p>
                <div class="flex flex-wrap gap-1 mt-2">
                  <UBadge v-for="t in a.tags" :key="t.slug" variant="subtle" size="xs" color="primary">#{{ t.name }}</UBadge>
                </div>
                <div class="text-xs text-muted mt-2">
                  {{ a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('zh-CN') : '' }} · {{ a.viewCount }} 阅读
                </div>
              </div>
            </div>
          </NuxtLink>
        </UCard>
      </div>
    </div>
  </div>
</template>
