<script setup lang="ts">
import type { PublicArticleListItem, PublicTag } from '#shared/types'

const route = useRoute()
const config = useRuntimeConfig()

const page = ref(1)
const tag = computed(() => (route.query.tag as string) || undefined)

useSeoMeta({
  title: '最新文章',
  description: '来自社区作者的最新发布内容，按标签聚合的优质文章流。',
  ogType: 'website',
  ogTitle: () => config.public.siteName,
  ogDescription: '来自社区作者的最新发布内容，按标签聚合的优质文章流。',
  ogUrl: () => `${config.public.siteUrl}/`,
  ogImage: () => `${config.public.siteUrl}/og/default`,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageAlt: () => config.public.siteName,
  twitterCard: 'summary_large_image',
  twitterTitle: () => config.public.siteName,
  twitterDescription: '来自社区作者的最新发布内容，按标签聚合的优质文章流。',
  twitterImage: () => `${config.public.siteUrl}/og/default`,
  robots: 'index, follow',
})

// canonical 必须是 <link rel="canonical">，useSeoMeta 的 canonical 会渲染成无效的 <meta name="canonical">
useHead(() => ({ link: [{ rel: 'canonical', href: `${config.public.siteUrl}/` }] }))

const isLocalImg = (src?: string | null) => !!src && !/^https?:\/\//i.test(src)
const PLACEHOLDER_COVER = '/placeholder-cover.svg'
// 文章无封面图时回退到默认占位图（占位图为本地资源，走 NuxtImg 优化）
const coverSrc = (url?: string | null) => url || PLACEHOLDER_COVER

const { data: feed } = await useFetch<{ items: PublicArticleListItem[], meta: { page: number, pageSize: number, total: number, totalPages: number } }>(
  '/api/public/articles',
  { query: { pageSize: 12, page, tag }, watch: [page, tag] },
)

const { data: tags } = await useFetch<PublicTag[]>('/api/public/tags')

const items = computed(() => feed.value?.items ?? [])
const featured = computed(() => items.value[0])
const rest = computed(() => items.value.slice(1))

const maxTagCount = computed(() => Math.max(1, ...(tags.value?.map(t => t.count) ?? [1])))
function tagFontSize(count: number) {
  const ratio = count / maxTagCount.value
  return `${(0.82 + ratio * 0.5).toFixed(2)}rem`
}

function clearTag() {
  navigateTo({ path: '/', query: {} })
  page.value = 1
}

function scrollToFeed() {
  if (typeof document !== 'undefined') {
    document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' })
  }
}

const chipBase = 'rounded-full px-3.5 py-1.5 text-sm font-medium transition ring-1'
function chipClass(active: boolean) {
  return active
    ? `${chipBase} bg-primary text-inverted ring-primary`
    : `${chipBase} bg-elevated text-muted ring-default hover:text-highlighted hover:bg-muted`
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8 sm:py-10">
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-3xl">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -top-24 -left-20 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div class="absolute -bottom-24 right-0 size-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div class="relative rounded-3xl bg-gradient-to-br from-primary/10 via-default to-primary/5 ring-1 ring-default px-6 py-8 sm:px-9 sm:py-10">
        <UBadge variant="soft" color="primary" class="mb-3">
          <UIcon name="i-lucide-sparkles" class="size-3.5" />
          {{ config.public.siteName }}
        </UBadge>

        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-highlighted leading-tight">
          发现来自社区作者的<br class="hidden sm:block" />
          <span class="bg-gradient-to-r from-primary to-primary-400 bg-clip-text text-transparent">优质内容</span>
        </h1>

        <p class="mt-3 max-w-lg text-sm sm:text-base text-muted">
          汇聚技术、生活与思考，按标签聚合的最新文章流。在这里阅读、收藏，并连接你喜欢的作者。
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <UButton icon="i-lucide-arrow-down" size="md" @click="scrollToFeed">浏览文章</UButton>
          <UButton to="/register" variant="soft" color="primary" size="md" icon="i-lucide-pen-line">成为作者</UButton>
        </div>

        <dl class="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div class="flex items-baseline gap-2">
            <dt class="text-muted">已发布文章</dt>
            <dd class="text-2xl font-bold text-highlighted tabular-nums">{{ feed?.meta.total ?? 0 }}</dd>
          </div>
          <div class="flex items-baseline gap-2">
            <dt class="text-muted">标签</dt>
            <dd class="text-2xl font-bold text-highlighted tabular-nums">{{ tags?.length ?? 0 }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Tag filter -->
    <section class="mt-8">
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/" :class="chipClass(!tag)">全部</NuxtLink>
        <NuxtLink
          v-for="t in tags ?? []"
          :key="t.slug"
          :to="`/?tag=${t.slug}`"
          :class="chipClass(tag === t.slug)"
        >
          #{{ t.name }}
          <span class="ml-1 opacity-60">{{ t.count }}</span>
        </NuxtLink>
        <UButton
          v-if="tag"
          icon="i-lucide-x"
          color="primary"
          variant="link"
          size="sm"
          class="p-0"
          @click="clearTag"
        >
          清除筛选
        </UButton>
      </div>
    </section>

    <!-- Feed + sidebar -->
    <section id="feed" class="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
      <div class="space-y-6 min-w-0">
        <UCard v-if="!feed || items.length === 0" class="py-16 text-center text-muted">
          还没有已发布的文章
        </UCard>

        <!-- Featured -->
        <article
          v-if="featured"
          class="group relative block rounded-2xl ring-1 ring-default bg-elevated overflow-hidden hover:shadow-lg hover:ring-primary/40 transition"
        >
          <div class="flex flex-col md:flex-row">
            <NuxtLink :to="`/u/${featured.author.username}/${featured.slug}`" class="md:w-2/5 relative bg-muted block overflow-hidden">
              <NuxtImg v-if="isLocalImg(coverSrc(featured.coverUrl))" :src="coverSrc(featured.coverUrl)" alt="" width="640" height="400" loading="lazy" decoding="async" class="w-full h-56 md:h-full object-cover group-hover:scale-105 transition duration-500" />
              <img v-else :src="coverSrc(featured.coverUrl)" alt="" loading="lazy" decoding="async" class="w-full h-56 md:h-full object-cover group-hover:scale-105 transition duration-500" />
            </NuxtLink>
            <div class="md:w-3/5 p-6 flex flex-col">
              <div class="flex items-center gap-2 mb-2">
                <UBadge variant="soft" color="primary">精选</UBadge>
                <span class="text-xs text-muted">{{ featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString('zh-CN') : '' }}</span>
              </div>
              <h2 class="text-2xl font-bold text-highlighted leading-snug">
                <NuxtLink :to="`/u/${featured.author.username}/${featured.slug}`" class="group-hover:text-primary transition">
                  {{ featured.title }}
                </NuxtLink>
              </h2>
              <p class="mt-2 text-muted line-clamp-3">{{ featured.summary || '（无摘要）' }}</p>
              <div class="mt-auto pt-4 flex items-center gap-1.5 text-xs text-muted">
                <UAvatar :src="featured.author.avatarUrl || ''" :alt="featured.author.displayName" size="xs" />
                <NuxtLink :to="`/u/${featured.author.username}`" class="hover:text-primary">{{ featured.author.displayName }}</NuxtLink>
                <span>·</span>
                <span>{{ featured.viewCount }} 阅读</span>
                <span>·</span>
                <span>{{ featured.wordCount }} 字</span>
              </div>
            </div>
          </div>
        </article>

        <!-- Grid -->
        <div class="grid gap-5 sm:grid-cols-2">
          <article
            v-for="a in rest"
            :key="a.id"
            class="group block rounded-2xl ring-1 ring-default bg-elevated overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:ring-primary/40 transition"
          >
            <NuxtLink :to="`/u/${a.author.username}/${a.slug}`" class="relative aspect-[16/9] bg-muted block overflow-hidden">
              <NuxtImg v-if="isLocalImg(coverSrc(a.coverUrl))" :src="coverSrc(a.coverUrl)" alt="" width="480" height="270" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              <img v-else :src="coverSrc(a.coverUrl)" alt="" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            </NuxtLink>
            <div class="p-4">
              <div class="flex flex-wrap items-center gap-1 mb-2">
                <NuxtLink v-for="t in a.tags" :key="t.slug" :to="`/?tag=${t.slug}`">
                  <UBadge variant="subtle" size="xs" color="primary">#{{ t.name }}</UBadge>
                </NuxtLink>
              </div>
              <h3 class="font-semibold text-lg text-highlighted leading-snug">
                <NuxtLink :to="`/u/${a.author.username}/${a.slug}`" class="group-hover:text-primary transition">
                  {{ a.title }}
                </NuxtLink>
              </h3>
              <p class="mt-1 text-sm text-muted line-clamp-2">{{ a.summary || '（无摘要）' }}</p>
              <div class="flex items-center gap-1.5 mt-3 text-xs text-muted">
                <UAvatar :src="a.author.avatarUrl || ''" :alt="a.author.displayName" size="xs" />
                <NuxtLink :to="`/u/${a.author.username}`" class="hover:text-primary">{{ a.author.displayName }}</NuxtLink>
                <span>·</span>
                <span>{{ a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('zh-CN') : '' }}</span>
                <span>·</span>
                <span>{{ a.viewCount }} 阅读</span>
              </div>
            </div>
          </article>
        </div>

        <div v-if="feed && feed.meta.totalPages > 1" class="flex justify-center pt-2">
          <UPagination v-model:page="page" :total="feed.meta.total" :items-per-page="feed.meta.pageSize" />
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-4">
        <UCard>
          <template #header>
            <span class="font-medium">热门标签</span>
          </template>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <NuxtLink
              v-for="t in tags ?? []"
              :key="t.slug"
              :to="`/?tag=${t.slug}`"
              :style="{ fontSize: tagFontSize(t.count) }"
              class="font-medium text-muted hover:text-primary transition leading-none"
            >
              #{{ t.name }}
            </NuxtLink>
            <p v-if="!tags || tags.length === 0" class="text-sm text-muted">暂无标签</p>
          </div>
        </UCard>

        <UCard class="bg-gradient-to-br from-primary/10 to-default ring-primary/20">
          <template #header>
            <span class="font-medium">关于 {{ config.public.siteName }}</span>
          </template>
          <p class="text-sm text-muted">
            一个由社区作者共同书写的内容平台。注册成为作者，发布你的文章，连接你的读者。
          </p>
          <UButton to="/register" block color="primary" class="mt-4">成为作者</UButton>
        </UCard>
      </aside>
    </section>
  </div>
</template>
