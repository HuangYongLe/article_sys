<script setup lang="ts">
import { dashboardNav, isNavActive } from '~/config/nav'

const config = useRuntimeConfig()
const route = useRoute()
const links = dashboardNav
const section = 'dashboard' as const
const mobileNavOpen = ref(false)

useSectionTabs(section)

// 路由切换时自动关闭移动端抽屉
watch(() => route.path, () => { mobileNavOpen.value = false })
</script>

<template>
  <div class="min-h-screen flex bg-default">
    <!-- 桌面端侧边栏 -->
    <aside class="hidden md:flex w-56 shrink-0 border-r border-default flex-col">
      <div class="h-14 flex items-center px-4 border-b border-default">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 font-bold text-highlighted">
          <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-feather" class="size-4" />
          </span>
          {{ config.public.siteName }}创作管理
        </NuxtLink>
      </div>
      <nav class="flex-1 p-2 space-y-1">
        <UButton
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :label="link.label"
          variant="ghost"
          color="neutral"
          :class="isNavActive(link, route.path) ? 'bg-elevated text-primary' : ''"
          class="w-full justify-start"
        />
      </nav>
      <div class="p-2 border-t border-default">
        <DashboardUserMenu />
      </div>
    </aside>

    <!-- 移动端抽屉 -->
    <Teleport to="body">
      <Transition name="nav-backdrop">
        <div v-if="mobileNavOpen" class="fixed inset-0 z-40 bg-black/40 md:hidden" @click="mobileNavOpen = false" />
      </Transition>
      <Transition name="nav-drawer">
        <aside v-if="mobileNavOpen" class="fixed inset-y-0 left-0 z-50 w-64 max-w-[80%] bg-default border-r border-default flex flex-col md:hidden">
          <div class="h-14 flex items-center justify-between px-4 border-b border-default">
            <span class="flex items-center gap-2 font-bold text-highlighted">
              <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-feather" class="size-4" />
              </span>
              {{ config.public.siteName }}创作管理
            </span>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" :padded="false" @click="mobileNavOpen = false" />
          </div>
          <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
            <UButton
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :icon="link.icon"
              :label="link.label"
              variant="ghost"
              color="neutral"
              :class="isNavActive(link, route.path) ? 'bg-elevated text-primary' : ''"
              class="w-full justify-start"
            />
        </nav>
        <div class="p-2 border-t border-default">
          <DashboardUserMenu inline />
        </div>
      </aside>
      </Transition>
    </Teleport>

    <main class="flex-1 min-w-0 flex flex-col">
      <SectionTabs :section="section" @toggle-mobile-nav="mobileNavOpen = true" />
      <div class="flex-1 min-h-0">
        <slot />
      </div>
    </main>
  </div>
</template>

<style>
.nav-drawer-enter-active, .nav-drawer-leave-active { transition: transform 0.25s ease; }
.nav-drawer-enter-from, .nav-drawer-leave-to { transform: translateX(-100%); }
.nav-backdrop-enter-active, .nav-backdrop-leave-active { transition: opacity 0.2s ease; }
.nav-backdrop-enter-from, .nav-backdrop-leave-to { opacity: 0; }
</style>
