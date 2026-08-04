<script setup lang="ts">
const config = useRuntimeConfig()
const { user } = useUserSession()
const { confirmLogout } = useLogout()

const isAdmin = computed(() => user.value?.role === 'super_admin')

const items = computed(() => [
  ...(isAdmin.value
    ? [[{ label: `${config.public.siteName}中控平台`, icon: 'i-lucide-shield', to: '/admin' }, { label: `${config.public.siteName}创作管理`, icon: 'i-lucide-feather', to: '/dashboard' }]]
    : []),
  [{ label: '退出登录', icon: 'i-lucide-log-out', color: 'error', onSelect: confirmLogout }],
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'start' }">
    <UButton variant="ghost" color="neutral" class="w-full justify-start" icon="i-lucide-circle-user">
      {{ user?.displayName ?? user?.username ?? '未登录' }}
    </UButton>
  </UDropdownMenu>
</template>
