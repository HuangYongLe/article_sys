<script setup lang="ts">
import type { Tag } from '~~/server/database/schema'

const props = defineProps<{ articleId?: string }>()

const store = useEditorStore()
const toast = useToast()
const router = useRouter()

// 加载文章 / 重置
onMounted(async () => {
  if (props.articleId) {
    try {
      await store.load(props.articleId)
    }
    catch {
      toast.add({ title: '文章不存在', color: 'error' })
      router.replace('/dashboard/articles')
    }
  }
  else {
    store.reset()
  }
})
onUnmounted(() => store.reset())

// 内容变更标脏（applyDTO 写入服务端返回时不标脏）
watch(() => [store.title, store.content, store.summary, store.slug, store.coverUrl, store.tagIds], () => {
  if (store.applying) return
  store.dirty = true
}, { deep: true })

// 离开提醒
onBeforeRouteLeave(() => {
  if (store.dirty && !confirm('有未保存的修改，确定离开吗？')) return false
})

// ---------- 保存 ----------
async function save(silent = false) {
  if (!store.title.trim()) {
    toast.add({ title: '请先填写标题', color: 'warning' })
    return false
  }
  try {
    const isNew = !store.id
    const id = await store.save()
    if (!silent) toast.add({ title: '已保存', color: 'success' })
    if (isNew) router.replace(`/dashboard/articles/${id}`)
    return true
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '保存失败', color: 'error' })
    return false
  }
}

// Ctrl/Cmd + S
defineShortcuts({ meta_s: () => { save() } })

async function publishToggle() {
  if (store.dirty || !store.id) {
    const ok = await save(true)
    if (!ok) return
  }
  try {
    const action = store.status === 'published' ? 'unpublish' : 'publish'
    await store.setStatus(action)
    toast.add({ title: action === 'publish' ? '文章已发布' : '已转为草稿', color: 'success' })
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '操作失败', color: 'error' })
  }
}

// ---------- 标签 ----------
const { data: tags, refresh: refreshTags } = await useAsyncData(
  'my-tags',
  () => $fetch<Tag[]>('/api/tags'),
  { server: false },
)
const tagOptions = computed(() =>
  (tags.value ?? []).map(t => ({ label: t.name, value: t.id })),
)
const newTagName = ref('')
async function createTag() {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    const tag = await $fetch<Tag>('/api/tags', { method: 'POST', body: { name } })
    await refreshTags()
    if (!store.tagIds.includes(tag.id)) store.tagIds = [...store.tagIds, tag.id]
    newTagName.value = ''
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '创建标签失败', color: 'error' })
  }
}

// ---------- 封面 ----------
const coverInput = ref<HTMLInputElement>()
const uploadingCover = ref(false)
async function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingCover.value = true
  try {
    await store.uploadCover(file)
    toast.add({ title: '封面已上传', color: 'success' })
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '上传失败', color: 'error' })
  }
  finally {
    uploadingCover.value = false
    if (coverInput.value) coverInput.value.value = ''
  }
}

// ---------- 编辑器工具栏 ----------
const toolbarItems = [
  [
    { kind: 'undo' as const, icon: 'i-lucide-undo-2' },
    { kind: 'redo' as const, icon: 'i-lucide-redo-2' },
  ],
  [
    { kind: 'heading' as const, level: 1 as const, icon: 'i-lucide-heading-1' },
    { kind: 'heading' as const, level: 2 as const, icon: 'i-lucide-heading-2' },
    { kind: 'heading' as const, level: 3 as const, icon: 'i-lucide-heading-3' },
  ],
  [
    { kind: 'mark' as const, mark: 'bold' as const, icon: 'i-lucide-bold' },
    { kind: 'mark' as const, mark: 'italic' as const, icon: 'i-lucide-italic' },
    { kind: 'mark' as const, mark: 'strike' as const, icon: 'i-lucide-strikethrough' },
    { kind: 'mark' as const, mark: 'code' as const, icon: 'i-lucide-code' },
  ],
  [
    { kind: 'bulletList' as const, icon: 'i-lucide-list' },
    { kind: 'orderedList' as const, icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote' as const, icon: 'i-lucide-quote' },
    { kind: 'codeBlock' as const, icon: 'i-lucide-square-code' },
    { kind: 'horizontalRule' as const, icon: 'i-lucide-minus' },
  ],
  [
    { kind: 'link' as const, icon: 'i-lucide-link' },
    { kind: 'image' as const, icon: 'i-lucide-image' },
  ],
]

const statusLabel = computed(() =>
  ({ draft: '草稿', published: '已发布', archived: '已归档' })[store.status],
)
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- 顶栏 -->
    <header class="h-14 shrink-0 border-b border-default flex items-center gap-3 px-4">
      <UButton to="/dashboard/articles" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" />
      <UBadge variant="subtle" :color="store.status === 'published' ? 'success' : 'neutral'" size="sm">
        {{ statusLabel }}
      </UBadge>
      <UBadge v-if="store.visibility === 'private'" color="error" variant="subtle" size="sm">已被下架</UBadge>
      <span v-if="store.dirty" class="text-xs text-muted">未保存</span>

      <div class="ml-auto flex items-center gap-2">
        <UButton variant="ghost" color="neutral" size="sm" :loading="store.saving" @click="save()">
          保存
        </UButton>
        <UButton
          size="sm"
          :color="store.status === 'published' ? 'neutral' : 'primary'"
          :variant="store.status === 'published' ? 'outline' : 'solid'"
          @click="publishToggle"
        >
          {{ store.status === 'published' ? '转为草稿' : '发布' }}
        </UButton>
      </div>
    </header>

    <div class="flex-1 min-h-0 flex">
      <!-- 主编辑区 -->
      <div class="flex-1 min-w-0 overflow-y-auto">
        <div class="max-w-3xl mx-auto px-6 py-6 space-y-4">
          <UInput
            v-model="store.title"
            placeholder="文章标题"
            variant="none"
            size="xl"
            class="w-full"
            :ui="{ base: 'text-3xl font-bold px-0' }"
          />

          <ClientOnly>
            <UEditor
              v-slot="{ editor }"
              v-model="store.content"
              content-type="markdown"
              placeholder="开始写作，支持 Markdown 快捷输入（# 标题、- 列表、``` 代码块…）"
              class="min-h-[60vh]"
            >
              <UEditorToolbar
                :editor="editor"
                :items="toolbarItems"
                layout="fixed"
                class="sticky top-0 z-10 bg-default border-b border-default mb-4 pb-2"
              />
            </UEditor>
            <template #fallback>
              <div class="min-h-[60vh] flex items-center justify-center text-muted">编辑器加载中…</div>
            </template>
          </ClientOnly>
        </div>
      </div>

      <!-- 侧栏设置 -->
      <aside class="w-72 shrink-0 border-l border-default overflow-y-auto p-4 space-y-5">
        <UFormField label="Slug" help="留空则由标题自动生成">
          <UInput v-model="store.slug" placeholder="my-article" size="sm" class="w-full" />
        </UFormField>

        <UFormField label="摘要">
          <UTextarea v-model="store.summary" :rows="3" placeholder="列表页展示的简介…" size="sm" class="w-full" />
        </UFormField>

        <UFormField label="标签">
          <USelectMenu
            v-model="store.tagIds"
            :items="tagOptions"
            value-key="value"
            multiple
            placeholder="选择标签"
            size="sm"
            class="w-full"
          />
          <div class="flex gap-1 mt-2">
            <UInput
              v-model="newTagName"
              placeholder="新建标签"
              size="xs"
              class="flex-1"
              @keydown.enter.prevent="createTag"
            />
            <UButton size="xs" variant="soft" icon="i-lucide-plus" @click="createTag" />
          </div>
        </UFormField>

        <UFormField label="封面图">
          <div
            v-if="store.coverUrl"
            class="relative group rounded-lg overflow-hidden border border-default"
          >
            <img :src="store.coverUrl" alt="封面" class="w-full h-32 object-cover">
            <UButton
              icon="i-lucide-x"
              size="xs"
              color="error"
              class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
              @click="store.coverUrl = null"
            />
          </div>
          <UButton
            v-else
            variant="dashed"
            color="neutral"
            block
            icon="i-lucide-image-plus"
            :loading="uploadingCover"
            @click="coverInput?.click()"
          >
            上传封面
          </UButton>
          <input
            ref="coverInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="onCoverChange"
          >
        </UFormField>

        <UAlert
          v-if="store.moderationNote"
          color="error"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="管理员备注"
          :description="store.moderationNote"
        />
      </aside>
    </div>
  </div>
</template>
