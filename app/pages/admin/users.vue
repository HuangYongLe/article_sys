<script setup lang="ts">
import type { AdminUserListResult, AdminUserListItem, UserStatus } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const toast = useToast()

const statusFilter = ref<UserStatus | 'all'>('pending')
const search = ref('')
const page = ref(1)
const pageSize = 20
const data = ref<AdminUserListResult | null>(null)
const loading = ref(false)
const loadingId = ref<string | null>(null)

const tabs: { value: UserStatus | 'all', label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'active', label: '已通过' },
  { value: 'disabled', label: '已禁用' },
  { value: 'rejected', label: '已拒绝' },
]

const statusMeta: Record<UserStatus, { label: string, color: string }> = {
  pending: { label: '待审核', color: 'warning' },
  active: { label: '已通过', color: 'success' },
  disabled: { label: '已禁用', color: 'error' },
  rejected: { label: '已拒绝', color: 'neutral' },
}

const counts = computed(() => data.value?.counts ?? { pending: 0, active: 0, disabled: 0, rejected: 0 })
const total = computed(() => data.value?.meta.total ?? 0)
// 「全部」标签固定显示的总数（不受 status 筛选影响）
const grandTotal = computed(() => data.value?.grandTotal ?? total.value)

async function load() {
  loading.value = true
  try {
    data.value = await $fetch('/api/admin/users', {
      query: {
        status: statusFilter.value,
        q: search.value.trim() || undefined,
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

function setFilter(value: UserStatus | 'all') {
  statusFilter.value = value
  page.value = 1
  load()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

watch(page, () => load())

function fmt(ts: number | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}

const roleLabel = (role: string) => (role === 'super_admin' ? '超管' : '作者')

async function act(u: AdminUserListItem, action: 'approve' | 'disable' | 'enable' | 'reject', reason?: string) {
  loadingId.value = u.id
  try {
    await $fetch(`/api/admin/users/${u.id}/${action}`, {
      method: 'POST',
      body: reason !== undefined ? { reason } : undefined,
    })
    toast.add({ title: '操作成功', color: 'success' })
    await load()
  }
  catch (e: any) {
    toast.add({ title: e?.data?.message ?? '操作失败', color: 'error' })
  }
  finally {
    loadingId.value = null
  }
}

// 拒绝原因弹窗
const rejectOpen = ref(false)
const rejectTarget = ref<AdminUserListItem | null>(null)
const rejectReason = ref('')
const rejecting = ref(false)

function openReject(u: AdminUserListItem) {
  rejectTarget.value = u
  rejectReason.value = ''
  rejectOpen.value = true
}

async function confirmReject() {
  if (!rejectTarget.value) return
  rejecting.value = true
  try {
    await act(rejectTarget.value, 'reject', rejectReason.value || undefined)
    rejectOpen.value = false
  }
  finally {
    rejecting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">用户管理</h1>
        <p class="text-sm text-muted">审核自助注册账号，管理已注册用户的状态</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="t in tabs"
          :key="t.value"
          size="sm"
          :variant="statusFilter === t.value ? 'solid' : 'soft'"
          :color="t.value === 'pending' ? 'warning' : 'neutral'"
          @click="setFilter(t.value)"
        >
          {{ t.label }}
          <UBadge
            v-if="t.value === 'all' ? grandTotal : counts[t.value as UserStatus]"
            :color="t.value === 'pending' ? 'warning' : 'neutral'"
            :variant="statusFilter === t.value ? 'solid' : 'soft'"
            class="ml-1 tabular-nums"
          >
            {{ t.value === 'all' ? grandTotal : counts[t.value as UserStatus] }}
          </UBadge>
        </UButton>
      </div>
      <UInput
        v-model="search"
        placeholder="搜索用户名 / 显示名 / 邮箱"
        icon="i-lucide-search"
        class="ml-auto w-64 max-w-full"
      />
    </div>

    <UCard>
      <div v-if="loading && !data" class="py-12 text-center text-muted">加载中…</div>
      <div v-else-if="!data || data.items.length === 0" class="py-12 text-center text-muted">
        暂无用户
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted border-b border-default">
            <th class="py-2 pr-3 font-medium">用户</th>
            <th class="py-2 pr-3 font-medium">邮箱</th>
            <th class="py-2 pr-3 font-medium">角色</th>
            <th class="py-2 pr-3 font-medium">状态</th>
            <th class="py-2 pr-3 font-medium">注册时间</th>
            <th class="py-2 pr-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in data.items" :key="u.id" class="border-b border-default/60">
            <td class="py-3 pr-3">
              <div class="flex items-center gap-2">
                <UAvatar :src="u.avatarUrl || ''" :alt="u.displayName" size="sm" />
                <div>
                  <div class="font-medium">{{ u.displayName }}</div>
                  <div class="text-xs text-muted">@{{ u.username }}</div>
                </div>
              </div>
            </td>
            <td class="py-3 pr-3 text-muted">{{ u.email || '—' }}</td>
            <td class="py-3 pr-3">{{ roleLabel(u.role) }}</td>
            <td class="py-3 pr-3">
              <UBadge :color="statusMeta[u.status].color as any" variant="subtle">
                {{ statusMeta[u.status].label }}
              </UBadge>
            </td>
            <td class="py-3 pr-3 text-muted">{{ fmt(u.createdAt) }}</td>
            <td class="py-3 pr-3">
              <div class="flex justify-end gap-1">
                <UButton v-if="u.status === 'pending'" size="xs" color="success" :loading="loadingId === u.id" @click="act(u, 'approve')">通过</UButton>
                <UButton v-if="u.status === 'pending'" size="xs" color="neutral" variant="soft" @click="openReject(u)">拒绝</UButton>
                <UButton v-if="u.status === 'active'" size="xs" color="error" variant="soft" :loading="loadingId === u.id" @click="act(u, 'disable')">禁用</UButton>
                <UButton v-if="u.status === 'disabled' || u.status === 'rejected'" size="xs" color="success" variant="soft" :loading="loadingId === u.id" @click="act(u, 'enable')">启用</UButton>
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

    <UModal v-model:open="rejectOpen" title="拒绝注册申请">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            正在拒绝 <span class="font-medium text-highlighted">@{{ rejectTarget?.username }}</span> 的注册申请。
          </p>
          <UTextarea v-model="rejectReason" placeholder="拒绝原因（选填，可告知用户）" :rows="3" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="soft" color="neutral" @click="rejectOpen = false">取消</UButton>
          <UButton color="error" :loading="rejecting" @click="confirmReject">确认拒绝</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
