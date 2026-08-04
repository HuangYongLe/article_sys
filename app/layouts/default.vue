<script setup lang="ts">
const config = useRuntimeConfig()
const { loggedIn, user } = useUserSession()
const { confirmLogout } = useLogout()

const items = computed(() => {
  const menu: any[] = []
  if (user.value?.role === 'super_admin') {
    menu.push({ label: `${config.public.siteName}中控平台`, icon: 'i-lucide-shield', to: '/admin' })
  }
  menu.push({ label: `${config.public.siteName}创作管理`, icon: 'i-lucide-feather', to: '/dashboard' })
  menu.push({ label: '退出登录', icon: 'i-lucide-log-out', color: 'error', onSelect: confirmLogout })
  return menu
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <header class="border-b border-default">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg text-highlighted">
          <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-feather" class="size-4" />
          </span>
          {{ config.public.siteName }}
        </NuxtLink>
        <!-- 公开页 header：已登录显示用户名+菜单，未登录显示登录按钮 -->
        <nav class="flex items-center gap-2">
          <UColorModeSwitch class="mr-1" />
          <UDropdownMenu v-if="loggedIn" :items="items" :content="{ align: 'end' }">
            <UButton variant="ghost" color="neutral" class="rounded-full" icon="i-lucide-circle-user">
              {{ user?.displayName ?? user?.username }}
            </UButton>
          </UDropdownMenu>
          <UButton
            v-else
            to="/login"
            color="primary"
            variant="solid"
            size="sm"
            class="rounded-full font-medium shadow-sm"
            icon="i-lucide-log-in"
          >
            登录
          </UButton>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-default py-6">
      <p class="text-center text-sm text-muted">
        © {{ new Date().getFullYear() }} {{ config.public.siteName }} · 内容创作平台
      </p>
    </footer>
  </div>
</template>
