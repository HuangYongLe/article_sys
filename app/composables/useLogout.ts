import ConfirmModal from '~/components/ConfirmModal.vue'

/**
 * 退出登录：先弹窗确认，再调用登出接口并清理会话。
 * 依赖 @nuxt/ui 的 useOverlay（OverlayProvider 已在根 App 中挂载）。
 */
export function useLogout() {
  const overlay = useOverlay()
  const router = useRouter()
  const { clear } = useUserSession()

  async function confirmLogout() {
    const modal = overlay.create(ConfirmModal, {
      props: {
        title: '退出登录',
        description: '确定要退出当前账号吗？退出后需要重新登录。',
        confirmLabel: '退出登录',
        cancelLabel: '取消',
        confirmColor: 'error',
        icon: 'i-lucide-log-out',
      },
    })

    // open() 返回带 .result 的 overlay 句柄；点击遮罩/ESC 解析为 undefined（视为取消）
    const confirmed = await modal.open()
    if (!confirmed) return

    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    await clear()
    router.push('/login')
  }

  return { confirmLogout }
}
