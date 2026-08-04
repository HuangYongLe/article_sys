<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const form = reactive({ username: '', password: '', displayName: '' })
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    await $fetch('/api/_setup/bootstrap', { method: 'POST', body: { ...form } })
    await refreshSession()
    toast.add({ title: '初始化成功，欢迎！', color: 'success' })
    await navigateTo('/admin')
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '初始化失败', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <template #header>
      <div class="text-center space-y-1">
        <UIcon name="i-lucide-rocket" class="size-8 text-primary" />
        <h1 class="text-xl font-semibold">系统初始化</h1>
        <p class="text-sm text-muted">创建首个超级管理员（仅可执行一次）</p>
      </div>
    </template>

    <form class="space-y-4" @submit.prevent="submit">
      <UFormField label="用户名" name="username" help="小写字母、数字、连字符，3-40 位">
        <UInput v-model="form.username" placeholder="admin-user" icon="i-lucide-user" class="w-full" />
      </UFormField>

      <UFormField label="显示名" name="displayName">
        <UInput v-model="form.displayName" placeholder="站长" icon="i-lucide-id-card" class="w-full" />
      </UFormField>

      <UFormField label="密码" name="password" help="至少 8 位">
        <UInput v-model="form.password" type="password" icon="i-lucide-lock" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UButton type="submit" block :loading="loading">创建超级管理员</UButton>
    </form>
  </UCard>
</template>
