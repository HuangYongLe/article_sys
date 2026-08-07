<script setup lang="ts">
const props = defineProps<{ inline?: boolean }>()
const emit = defineEmits<{ select: [] }>()

const config = useRuntimeConfig()
const { user } = useUserSession()
const { confirmLogout } = useLogout()

const isAdmin = computed(() => user.value?.role === 'super_admin')

interface MenuEntry {
  label: string
  icon: string
  to?: string
  color?: string
  onSelect?: () => void
}

const groups = computed<MenuEntry[][]>(() => [
  ...(isAdmin.value
    ? [[
        { label: `${config.public.siteName}中控平台`, icon: 'i-lucide-shield', to: '/admin' },
        { label: `${config.public.siteName}创作管理`, icon: 'i-lucide-feather', to: '/dashboard' },
      ]]
    : []),
  [{ label: '退出登录', icon: 'i-lucide-log-out', color: 'error', onSelect: confirmLogout }],
])

function onItemClick(item: MenuEntry) {
  // 内联模式下（移动端抽屉）点击任意项先通知父级收起抽屉，避免退出确认弹窗被抽屉遮挡
  emit('select')
  item.onSelect?.()
}
</script>

<template>
  <!-- 移动端抽屉：内联展示，避免 UDropdownMenu 在 fixed 抽屉底部向下弹出被推出屏幕 -->
  <div v-if="inline" class="space-y-1">
    <div class="flex items-center gap-2 px-1 py-1.5">
      <UAvatar :src="user?.avatarUrl || ''" :alt="user?.displayName || ''" size="sm" />
      <span class="font-medium truncate">{{ user?.displayName ?? user?.username ?? '未登录' }}</span>
    </div>
    <template v-for="(group, gi) in groups" :key="gi">
      <div v-if="gi > 0" class="border-t border-default my-1" />
      <UButton
        v-for="item in group"
        :key="item.label"
        :icon="item.icon"
        :label="item.label"
        :color="item.color || 'neutral'"
        variant="ghost"
        class="w-full justify-start"
        :to="item.to"
        @click="onItemClick(item)"
      />
    </template>
  </div>

  <!-- 桌面侧栏：下拉菜单 -->
  <UDropdownMenu v-else :items="groups" :content="{ align: 'start' }">
    <UButton variant="ghost" color="neutral" class="w-full justify-start" icon="i-lucide-circle-user">
      {{ user?.displayName ?? user?.username ?? '未登录' }}
    </UButton>
  </UDropdownMenu>
</template>
