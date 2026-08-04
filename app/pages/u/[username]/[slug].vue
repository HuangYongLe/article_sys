<script setup lang="ts">
import type { PublicArticleDetail } from '#shared/types'

const route = useRoute()
const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)
const config = useRuntimeConfig()

const { data: article, error } = await useFetch<PublicArticleDetail>(
  `/api/public/articles/${username.value}/${slug.value}`,
)

useSeoMeta({
  title: () => article.value?.title ?? '文章',
  description: () => article.value?.summary ?? '',
  ogType: 'article',
  articleAuthor: () => article.value?.author.displayName,
  articlePublishedTime: () => article.value?.publishedAt ? new Date(article.value.publishedAt).toISOString() : undefined,
  ogTitle: () => article.value?.title ?? '文章',
  ogDescription: () => article.value?.summary ?? '',
  ogUrl: () => `${config.public.siteUrl}/u/${username.value}/${slug.value}`,
  ogImage: () => `${config.public.siteUrl}/og/${username.value}/${slug.value}`,
  ogImageWidth: '1200',
  ogImageHeight: '630',
  ogImageAlt: () => article.value?.title ?? '文章',
  twitterCard: 'summary_large_image',
  twitterTitle: () => article.value?.title ?? '文章',
  twitterDescription: () => article.value?.summary ?? '',
  twitterImage: () => `${config.public.siteUrl}/og/${username.value}/${slug.value}`,
  robots: 'index, follow',
})

// canonical 必须是 <link rel="canonical">
useHead(() => ({ link: [{ rel: 'canonical', href: `${config.public.siteUrl}/u/${username.value}/${slug.value}` }] }))

const isLocalImg = (src?: string | null) => !!src && !/^https?:\/\//i.test(src)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
}
</script>

<template>
  <div v-if="article" class="max-w-3xl mx-auto px-4 py-10">
    <NuxtImg v-if="article.coverUrl && isLocalImg(article.coverUrl)" :src="article.coverUrl" alt="" width="1200" height="630" loading="lazy" decoding="async" class="w-full rounded-xl mb-6 aspect-[1200/630] object-cover" />
    <img v-else-if="article.coverUrl" :src="article.coverUrl" alt="" loading="lazy" decoding="async" class="w-full rounded-xl mb-6 aspect-[1200/630] object-cover" />

    <NuxtLink :to="`/u/${article.author.username}`" class="text-sm text-muted hover:text-primary">
      ← {{ article.author.displayName }} 的文章
    </NuxtLink>

    <h1 class="text-3xl font-bold mt-3 mb-2 leading-snug">{{ article.title }}</h1>
    <div class="flex flex-wrap items-center gap-2 text-sm text-muted mb-4">
      <UAvatar :src="article.author.avatarUrl || ''" :alt="article.author.displayName" size="xs" />
      <NuxtLink :to="`/u/${article.author.username}`" class="hover:text-primary">{{ article.author.displayName }}</NuxtLink>
      <span>·</span>
      <span>{{ article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('zh-CN') : '' }}</span>
      <span>·</span>
      <span>{{ article.viewCount }} 阅读</span>
      <span>·</span>
      <span>{{ article.wordCount }} 字</span>
    </div>

    <div v-if="article.tags.length" class="flex flex-wrap gap-2 mb-6">
      <NuxtLink v-for="t in article.tags" :key="t.slug" :to="`/?tag=${t.slug}`">
        <UBadge variant="soft" color="primary">#{{ t.name }}</UBadge>
      </NuxtLink>
    </div>

    <article class="article-content" v-html="article.contentHtml" />
  </div>
</template>

<style>
.article-content { line-height: 1.75; color: inherit; }
.article-content h1, .article-content h2, .article-content h3, .article-content h4 { font-weight: 700; margin: 1.5em 0 0.6em; line-height: 1.3; }
.article-content h1 { font-size: 1.6rem; }
.article-content h2 { font-size: 1.35rem; }
.article-content h3 { font-size: 1.15rem; }
.article-content p { margin: 0.85em 0; }
.article-content ul, .article-content ol { margin: 0.85em 0; padding-left: 1.5em; }
.article-content li { margin: 0.3em 0; }
.article-content a { color: var(--color-primary, #2563eb); text-decoration: underline; }
.article-content img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
.article-content pre { background: #0f172a; color: #e2e8f0; padding: 1em; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
.article-content code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
.article-content :not(pre) > code { background: rgba(127, 127, 127, 0.18); padding: 0.15em 0.4em; border-radius: 4px; }
.article-content blockquote { border-left: 3px solid #cbd5e1; padding-left: 1em; color: #64748b; margin: 1em 0; }
.article-content table { width: 100%; border-collapse: collapse; margin: 1em 0; }
.article-content th, .article-content td { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; }
</style>
