import { defineStore } from 'pinia'
import { navFor, type Section } from '~/config/nav'

export interface TabItem {
  /** 顶级导航 path，作为唯一 key，例如 /admin/articles */
  key: string
  label: string
  icon?: string
  section: Section
}

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    tabs: [] as TabItem[],
  }),
  getters: {
    sectionTabs: state => (section: Section) => state.tabs.filter(t => t.section === section),
  },
  actions: {
    open(tab: TabItem) {
      if (!this.tabs.some(t => t.key === tab.key)) this.tabs.push(tab)
    },
    close(key: string) {
      const i = this.tabs.findIndex(t => t.key === key)
      if (i !== -1) this.tabs.splice(i, 1)
    },
    /** 关闭该栏目下除 keepKeys 中指定的、以及栏目 home（概览）以外的所有标签 */
    closeOthers(section: Section, keepKeys: string[] = []) {
      const home = navFor(section).find(n => n.home)?.to
      const keep = new Set(keepKeys)
      if (home) keep.add(home)
      this.tabs = this.tabs.filter(t => t.section !== section || keep.has(t.key))
    },
  },
})
