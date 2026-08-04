import { ref, computed, reactive, onMounted } from '#imports'

export function useCaptcha() {
  const id = ref('')
  const svg = ref('')
  const answer = ref('')
  const loading = ref(false)

  const src = computed(() =>
    svg.value
      ? `data:image/svg+xml;utf8,${encodeURIComponent(svg.value)}`
      : '',
  )

  async function refresh() {
    loading.value = true
    try {
      const res = await $fetch<{ id: string, svg: string }>('/api/auth/captcha')
      id.value = res.id
      svg.value = res.svg
      answer.value = ''
    }
    finally {
      loading.value = false
    }
  }

  onMounted(refresh)

  // 用 reactive 包裹，使模板中 captcha.src / captcha.answer 等自动解包为值
  return reactive({ id, svg, src, answer, loading, refresh })
}
