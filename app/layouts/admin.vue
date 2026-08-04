<script setup lang="ts">
import { adminNav, isNavActive } from '~/config/nav'

const config = useRuntimeConfig()
const route = useRoute()
const links = adminNav
const section = 'admin' as const

useSectionTabs(section)
</script>

<template>
  <div class="min-h-screen flex bg-default">
    <aside class="w-56 shrink-0 border-r border-default flex flex-col">
      <div class="h-14 flex items-center gap-2 px-4 border-b border-default">
        <UIcon name="i-lucide-shield" class="text-error" />
        <NuxtLink to="/admin" class="font-bold text-highlighted">{{ config.public.siteName }}中控平台</NuxtLink>
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

    <main class="flex-1 min-w-0 flex flex-col">
      <SectionTabs :section="section" />
      <div class="flex-1 min-h-0">
        <slot />
      </div>
    </main>
  </div>
</template>
