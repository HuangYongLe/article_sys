<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
const articleId = computed(() => route.params.id as string)
</script>

<template>
  <DashboardArticleEditor :article-id="articleId" />
</template>
