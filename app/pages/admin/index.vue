<script setup lang="ts">
import type { AdminUserListResult } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { user } = useUserSession()
const pending = ref(0)

onMounted(async () => {
  try {
    const res = await $fetch<AdminUserListResult>('/api/admin/users', { query: { status: 'pending', pageSize: 1 } })
    pending.value = res.counts.pending
  }
  catch {
    pending.value = 0
  }
})
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div>
      <h1 class="text-2xl font-semibold">中控平台</h1>
      <p class="text-sm text-muted">你好，{{ user?.displayName }}。这里是平台治理中枢。</p>
    </div>

    <UCard v-if="pending > 0" class="border-warning/50">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-clock-alert" class="size-6 text-warning" />
        <div class="flex-1">
          <p class="font-medium">有 {{ pending }} 个注册申请待审核</p>
          <p class="text-sm text-muted">通过审核后，用户方可登录使用后台。</p>
        </div>
        <UButton to="/admin/users" color="warning" icon="i-lucide-arrow-right">去审核</UButton>
      </div>
    </UCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="text-primary" />
            <span class="font-medium">用户管理</span>
          </div>
        </template>
        <p class="text-sm text-muted mb-3">审核注册申请、管理账号状态与角色。</p>
        <UButton to="/admin/users" variant="soft" block>进入</UButton>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-files" class="text-primary" />
            <span class="font-medium">文章管理</span>
          </div>
        </template>
        <p class="text-sm text-muted mb-3">下架违规内容、调整公开/隐藏状态、批量处置。</p>
        <UButton to="/admin/articles" variant="soft" block>进入</UButton>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-scroll-text" class="text-primary" />
            <span class="font-medium">审计日志</span>
          </div>
        </template>
        <p class="text-sm text-muted mb-3">追踪关键操作与账号变更记录。</p>
        <UButton to="/admin/audit-logs" variant="soft" block>进入</UButton>
      </UCard>
    </div>
  </div>
</template>
