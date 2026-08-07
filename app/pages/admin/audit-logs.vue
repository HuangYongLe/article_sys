<script setup lang="ts">
import type { AdminAuditLogListResult, AdminAuditLogItem } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const toast = useToast()
const pageSize = 20

// 筛选条件
const action = ref('')
const targetType = ref('all')
const actor = ref('')
const q = ref('')
const page = ref(1)

const data = ref<AdminAuditLogListResult | null>(null)
const loading = ref(false)

// 请求令牌：组件卸载或发起新请求后，旧请求的回调一律丢弃，避免竞态与卸载后写入
let reqToken = 0

async function load() {
  const token = ++reqToken
  loading.value = true
  try {
    const res = await $fetch<AdminAuditLogListResult>('/api/admin/audit-logs', {
      query: {
        action: action.value.trim() || undefined,
        targetType: (targetType.value && targetType.value !== 'all') ? targetType.value : undefined,
        actor: actor.value.trim() || undefined,
        q: q.value.trim() || undefined,
        page: page.value,
        pageSize,
      },
    })
    if (token !== reqToken) return
    data.value = res
  }
  catch (e: any) {
    if (token !== reqToken) return
    toast.add({ title: e?.data?.message ?? e?.message ?? '加载失败', color: 'error' })
  }
  finally {
    if (token === reqToken) loading.value = false
  }
}

// 文本输入防抖提交，避免每次按键都打请求
let debounce: ReturnType<typeof setTimeout> | undefined
watch([action, actor, q], () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 1; load() }, 300)
})
// 下拉框 / 翻页即时生效
watch(targetType, () => { page.value = 1; load() })
watch(page, () => load())

onMounted(load)
// 卸载时清理定时器并作废在途请求，确保客户端路由切换不被拖死
onBeforeUnmount(() => {
  clearTimeout(debounce)
  reqToken++
})

const ACTION_LABELS: Record<string, string> = {
  'auth.login': '登录', 'auth.locked': '账号锁定', 'auth.register': '注册申请',
  'user.approve': '审核通过', 'user.reject': '审核拒绝', 'user.disable': '禁用用户', 'user.enable': '启用用户',
  'article.create': '创建文章', 'article.update': '更新文章', 'article.publish': '发布文章',
  'article.unpublish': '取消发布', 'article.archive': '归档文章', 'article.moderate': '审核文章',
  'article.bulk.hide': '批量下架', 'article.bulk.show': '批量公开', 'article.bulk.delete': '批量删除', 'article.delete': '删除文章',
  'system.bootstrap': '初始化超管',
}
function actionLabel(a: string) {
  return ACTION_LABELS[a] ?? a
}

const targetTypeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '用户', value: 'user' },
  { label: '文章', value: 'article' },
  { label: '系统', value: 'system' },
]

function fmt(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}
function actorName(i: AdminAuditLogItem) {
  if (!i.actorId) return '系统'
  return i.actorDisplayName ? `${i.actorDisplayName} (@${i.actorUsername})` : (i.actorUsername ?? i.actorId)
}
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div>
      <h1 class="text-2xl font-semibold">审计日志</h1>
      <p class="text-sm text-muted">追踪关键操作与账号变更记录（仅超管可见）</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <UInput v-model="action" icon="i-lucide-scroll-text" placeholder="操作 action" size="sm" class="w-48" />
      <USelect v-model="targetType" :items="targetTypeOptions" size="sm" class="w-32" />
      <UInput v-model="actor" icon="i-lucide-user" placeholder="操作人用户名" size="sm" class="w-40" />
      <UInput v-model="q" icon="i-lucide-search" placeholder="搜索操作" size="sm" class="ml-auto w-56 max-w-full" />
    </div>

    <UCard>
      <div v-if="loading && !data" class="py-12 text-center text-muted">加载中…</div>
      <div v-else-if="!data || data.items.length === 0" class="py-12 text-center text-muted">暂无日志记录</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm min-w-[640px]">
        <thead>
          <tr class="text-left text-muted border-b border-default">
            <th class="py-2 pr-3 font-medium">时间</th>
            <th class="py-2 pr-3 font-medium">操作人</th>
            <th class="py-2 pr-3 font-medium">操作</th>
            <th class="py-2 pr-3 font-medium">对象</th>
            <th class="py-2 pr-3 font-medium">详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in data.items" :key="i.id" class="border-b border-default/60 align-top">
            <td class="py-3 pr-3 text-muted whitespace-nowrap">{{ fmt(i.createdAt) }}</td>
            <td class="py-3 pr-3 whitespace-nowrap">{{ actorName(i) }}</td>
            <td class="py-3 pr-3"><UBadge variant="subtle" color="neutral">{{ actionLabel(i.action) }}</UBadge></td>
            <td class="py-3 pr-3 text-muted">
              <div>{{ i.targetType }}</div>
              <div class="text-xs truncate max-w-[160px]">{{ i.targetId }}</div>
            </td>
            <td class="py-3 pr-3 text-xs text-muted max-w-[280px]">
              <pre v-if="i.payload" class="whitespace-pre-wrap break-all bg-default/50 rounded p-2">{{ JSON.stringify(i.payload) }}</pre>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <div v-if="data && data.meta.totalPages > 1" class="flex items-center justify-end gap-2 pt-4">
        <UButton size="xs" variant="soft" :disabled="page <= 1" @click="page--">上一页</UButton>
        <span class="text-xs text-muted">第 {{ data.meta.page }} / {{ data.meta.totalPages }} 页</span>
        <UButton size="xs" variant="soft" :disabled="page >= data.meta.totalPages" @click="page++">下一页</UButton>
      </div>
    </UCard>
  </div>
</template>
