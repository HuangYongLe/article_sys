<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const captchaRef = ref<{ verify: () => Promise<{ id: string, answer: string }>, reset: () => void } | null>(null)

const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function submit() {
  if (!form.username || !form.password) {
    toast.add({ title: '请输入用户名和密码', color: 'warning' })
    return
  }
  loading.value = true
  try {
    // 点击登录后才弹出人机验证，验证通过才拿到 {id, answer}
    const cap = await captchaRef.value!.verify()
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        ...form,
        captchaId: cap.id,
        captchaAnswer: cap.answer,
      },
    })
    await refreshSession()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const fallback = res.user.role === 'super_admin' ? '/admin' : '/dashboard'
    await navigateTo(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : fallback)
  }
  catch (err: any) {
    if (err && err.cancelled) return // 用户主动关闭了验证窗口，不动
    captchaRef.value?.reset()
    toast.add({ title: err?.data?.message ?? '登录失败，请稍后重试', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <div class="mb-8 text-center">
      <UIcon name="i-lucide-feather" class="size-10 text-primary" />
      <h1 class="mt-4 text-2xl font-bold tracking-tight">欢迎回来</h1>
      <p class="mt-1.5 text-sm text-muted">登录以继续创作与管理你的文章</p>
    </div>

    <form class="space-y-5" @submit.prevent="submit">
      <UFormField label="用户名" name="username">
        <UInput
          v-model="form.username"
          size="xl"
          placeholder="用户名"
          icon="i-lucide-user"
          autocomplete="username"
          class="w-full"
          autofocus
        />
      </UFormField>

      <UFormField label="密码" name="password">
        <UInput
          v-model="form.password"
          type="password"
          size="xl"
          placeholder="密码"
          icon="i-lucide-lock"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <SliderCaptcha ref="captchaRef" />

      <UButton type="submit" block size="xl" :loading="loading" class="mt-8">登录</UButton>
    </form>

    <p class="mt-8 text-center text-sm text-muted">
      还没有账号？
      <NuxtLink to="/register" class="font-medium text-primary hover:underline">立即注册</NuxtLink>
    </p>
  </div>
</template>
