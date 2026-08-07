<script setup lang="ts">
import type { Tag } from '~~/server/database/schema'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const toast = useToast()
const { data: tags, refresh } = await useAsyncData('tags-page', () => $fetch<Tag[]>('/api/tags'), { server: false })

const newName = ref('')
async function create() {
  const name = newName.value.trim()
  if (!name) return
  try {
    await $fetch('/api/tags', { method: 'POST', body: { name } })
    newName.value = ''
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '创建失败', color: 'error' })
  }
}

async function remove(tag: Tag) {
  try {
    await $fetch(`/api/tags/${tag.id}`, { method: 'DELETE' })
    toast.add({ title: `已删除「${tag.name}」`, color: 'success' })
    await refresh()
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '删除失败', color: 'error' })
  }
}
</script>

<template>
  <div class="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold">标签管理</h1>

    <div class="flex gap-2">
      <UInput v-model="newName" placeholder="新标签名称" class="flex-1" @keydown.enter="create" />
      <UButton icon="i-lucide-plus" @click="create">添加</UButton>
    </div>

    <UCard v-if="!tags?.length" class="py-12 text-center text-muted">
      还没有标签
    </UCard>
    <div v-else class="flex flex-wrap gap-2">
      <UBadge
        v-for="tag in tags"
        :key="tag.id"
        variant="subtle"
        color="neutral"
        size="lg"
        class="gap-1"
      >
        {{ tag.name }}
        <UButton
          icon="i-lucide-x"
          size="xs"
          variant="link"
          color="neutral"
          :padded="false"
          @click="remove(tag)"
        />
      </UBadge>
    </div>
    <p class="text-xs text-muted">删除标签会同时把它从所有文章上移除。</p>
  </div>
</template>
