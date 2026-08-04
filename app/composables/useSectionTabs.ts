import { resolveNav, navFor, type Section } from '~/config/nav'
import { useTabsStore, type TabItem } from '~/stores/tabs'

/**
 * 在后台/中控台布局中调用：根据当前路由自动登记（打开）对应标签页，
 * 并始终保证栏目根页（概览）标签存在。标签在导航时不自动关闭，
 * 仅在用户点击关闭按钮时移除。
 */
export function useSectionTabs(section: Section) {
  const route = useRoute()
  const tabsStore = useTabsStore()

  function sync() {
    const home = navFor(section).find(n => n.home)
    if (home) {
      tabsStore.open({ key: home.to, label: home.label, icon: home.icon, section })
    }
    const nav = resolveNav(section, route.path)
    if (nav && nav.to !== home?.to) {
      tabsStore.open({ key: nav.to, label: nav.label, icon: nav.icon, section })
    }
  }

  sync()
  watch(() => route.path, sync)

  const tabs = computed<TabItem[]>(() => tabsStore.sectionTabs(section))
  return { tabs, tabsStore, route }
}
