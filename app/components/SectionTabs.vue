<script setup lang="ts">
import { resolveNav, type Section } from '~/config/nav'
import { useTabsStore, type TabItem } from '~/stores/tabs'

const props = defineProps<{ section: Section }>()

const route = useRoute()
const router = useRouter()
const tabsStore = useTabsStore()

const tabs = computed(() => tabsStore.sectionTabs(props.section))
const homeKey = computed(() => (props.section === 'admin' ? '/admin' : '/dashboard'))

function activeKey() {
  return resolveNav(props.section, route.path)?.to
}

function go(t: TabItem) {
  if (t.key !== activeKey()) router.push(t.key)
}

function close(t: TabItem, e: MouseEvent) {
  e.stopPropagation()
  const list = tabs.value
  tabsStore.close(t.key)
  if (t.key === activeKey()) {
    const idx = list.findIndex(x => x.key === t.key)
    const neighbor = list[idx - 1] ?? list[idx + 1]
    router.push(neighbor ? neighbor.key : homeKey.value)
  }
}

function closeOthers(e: MouseEvent) {
  e.stopPropagation()
  const active = activeKey()
  tabsStore.closeOthers(props.section, active ? [active] : [])
}
</script>

<template>
  <div class="flex items-stretch gap-px overflow-x-auto border-b border-default bg-elevated/40">
    <button
      v-for="t in tabs"
      :key="t.key"
      type="button"
      class="group flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm transition"
      :class="t.key === activeKey()
        ? 'border-primary bg-default text-primary'
        : 'border-transparent text-muted hover:bg-elevated hover:text-highlighted'"
      @click="go(t)"
      @click.middle="close(t, $event)"
    >
      <UIcon v-if="t.icon" :name="t.icon" class="size-4" />
      <span class="whitespace-nowrap">{{ t.label }}</span>
      <span
        v-if="t.key !== homeKey"
        role="button"
        tabindex="0"
        title="关闭标签页"
        class="ml-0.5 flex size-4 items-center justify-center rounded-sm opacity-40 transition hover:bg-default hover:text-error hover:opacity-100"
        @click="close(t, $event)"
        @keydown.enter.prevent="close(t, $event)"
      >
        <UIcon name="i-lucide-x" class="size-3" />
      </span>
    </button>

    <div class="ml-auto flex shrink-0 items-center gap-2 pr-2">
      <UColorModeSwitch />
      <button
        v-if="tabs.length > 1"
        type="button"
        title="关闭其他标签页"
        class="flex items-center px-3 text-xs text-muted transition hover:text-highlighted"
        @click="closeOthers"
      >
        关闭其他
      </button>
    </div>
  </div>
</template>
