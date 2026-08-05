<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const captchaRef = ref<{ verified: boolean, id: string, answer: string, reset: () => void } | null>(null)

const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function submit() {
  if (!form.username || !form.password) {
    toast.add({ title: '请输入用户名和密码', color: 'warning' })
    return
  }
  if (!captchaRef.value?.verified) {
    toast.add({ title: '请完成人机验证', color: 'warning' })
    return
  }
  loading.value = true
  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        ...form,
        captchaId: captchaRef.value.id,
        captchaAnswer: captchaRef.value.answer,
      },
    })
    await refreshSession()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const fallback = res.user.role === 'super_admin' ? '/admin' : '/dashboard'
    await navigateTo(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : fallback)
  }
  catch (err: any) {
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

      <UFormField label="人机验证" name="captcha">
        <SliderCaptcha ref="captchaRef" />
      </UFormField>

      <UButton type="submit" block size="xl" :loading="loading" class="mt-1">登录</UButton>
    </form>

    <p class="mt-8 text-center text-sm text-muted">
      还没有账号？
      <NuxtLink to="/register" class="font-medium text-primary hover:underline">立即注册</NuxtLink>
    </p>
  </div>
</template>
