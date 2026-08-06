<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const toast = useToast()
const captchaRef = ref<{ verify: () => Promise<{ id: string, answer: string }>, reset: () => void } | null>(null)
const form = reactive({ username: '', displayName: '', email: '', password: '', confirm: '' })
const loading = ref(false)
const registered = ref(false)

function validate(): string | null {
  if (!form.username || !form.displayName || !form.password) {
    return '请填写用户名、显示名和密码'
  }
  if (form.password.length < 8) {
    return '密码至少 8 位'
  }
  if (form.password !== form.confirm) {
    return '两次输入的密码不一致'
  }
  return null
}

async function submit() {
  const err = validate()
  if (err) {
    toast.add({ title: err, color: 'warning' })
    return
  }
  loading.value = true
  try {
    // 点击提交后才弹出人机验证，验证通过才拿到 {id, answer}
    const cap = await captchaRef.value!.verify()
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        username: form.username,
        displayName: form.displayName,
        email: form.email || undefined,
        password: form.password,
        captchaId: cap.id,
        captchaAnswer: cap.answer,
      },
    })
    registered.value = true
  }
  catch (e: any) {
    if (e && e.cancelled) return // 用户主动关闭了验证窗口，不动
    captchaRef.value?.reset()
    toast.add({ title: e?.data?.message ?? '注册失败，请稍后重试', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <div v-if="!registered" class="mb-8 text-center">
      <UIcon name="i-lucide-user-plus" class="size-10 text-primary" />
      <h1 class="mt-4 text-2xl font-bold tracking-tight">创建账号</h1>
      <p class="mt-1.5 text-sm text-muted">提交后需管理员审核通过方可登录</p>
    </div>

    <div v-if="registered" class="space-y-5 py-4 text-center">
      <UIcon name="i-lucide-circle-check-big" class="size-14 text-success mx-auto" />
      <div class="pb-40">
        <p class="text-lg font-semibold">注册申请已提交</p>
        <p class="mt-2 text-sm text-muted">
          我们已收到你的注册请求，管理员审核通过后会通知你登录。
        </p>
      </div>
      <UButton block size="xl" to="/login" icon="i-lucide-arrow-right">前往登录</UButton>
    </div>

    <form v-else class="space-y-5" @submit.prevent="submit">
      <UFormField label="用户名" name="username" help="小写字母、数字和连字符，3-40 位">
        <UInput
          v-model="form.username"
          size="xl"
          placeholder="用于登录的用户名"
          icon="i-lucide-user"
          autocomplete="username"
          class="w-full"
          autofocus
        />
      </UFormField>

      <UFormField label="显示名" name="displayName">
        <UInput
          v-model="form.displayName"
          size="xl"
          placeholder="展示给他人的名称"
          icon="i-lucide-badge-check"
          class="w-full"
        />
      </UFormField>

      <UFormField label="邮箱（选填）" name="email">
        <UInput
          v-model="form.email"
          type="email"
          size="xl"
          placeholder="用于接收通知"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UFormField label="密码" name="password">
        <UInput
          v-model="form.password"
          type="password"
          size="xl"
          placeholder="至少 8 位"
          icon="i-lucide-lock"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UFormField label="确认密码" name="confirm">
        <UInput
          v-model="form.confirm"
          type="password"
          size="xl"
          placeholder="再次输入密码"
          icon="i-lucide-lock"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <SliderCaptcha ref="captchaRef" />

      <UButton type="submit" block size="xl" :loading="loading" class="mt-1">提交注册</UButton>
    </form>

    <p v-if="!registered" class="mt-8 text-center text-sm text-muted">
      已有账号？
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">直接登录</NuxtLink>
    </p>
  </div>
</template>
