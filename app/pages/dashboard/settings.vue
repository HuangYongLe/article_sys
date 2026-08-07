<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { user, fetch: refreshSession } = useUserSession()
const toast = useToast()

const profile = reactive({
  displayName: user.value?.displayName ?? '',
  bio: '',
  avatarUrl: user.value?.avatarUrl ?? '',
})
const savingProfile = ref(false)

// 拉取完整资料（bio 不在会话里）
onMounted(async () => {
  try {
    const res = await $fetch('/api/auth/me')
    profile.displayName = res.user.displayName
    profile.bio = res.bio ?? ''
    profile.avatarUrl = res.user.avatarUrl ?? ''
  }
  catch { /* 忽略 */ }
})

async function saveProfile() {
  savingProfile.value = true
  try {
    await $fetch('/api/profile', {
      method: 'PATCH',
      body: {
        displayName: profile.displayName.trim(),
        bio: profile.bio.trim() || null,
        avatarUrl: profile.avatarUrl || null,
      },
    })
    await refreshSession()
    toast.add({ title: '资料已更新', color: 'success' })
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '保存失败', color: 'error' })
  }
  finally {
    savingProfile.value = false
  }
}

// ---------- 头像编辑 ----------
const avatarInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

async function onAvatarSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许重复选择同一文件
  if (!file) return
  uploadingAvatar.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ url: string }>('/api/upload/avatar', { method: 'POST', body: fd })
    profile.avatarUrl = res.url
    toast.add({ title: '头像已选择，点击“保存资料”生效', color: 'success' })
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '上传失败', color: 'error' })
  }
  finally {
    uploadingAvatar.value = false
  }
}

function removeAvatar() {
  profile.avatarUrl = ''
}

const pwd = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const savingPwd = ref(false)

async function changePassword() {
  if (pwd.newPassword !== pwd.confirm) {
    toast.add({ title: '两次输入的新密码不一致', color: 'warning' })
    return
  }
  savingPwd.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword },
    })
    Object.assign(pwd, { currentPassword: '', newPassword: '', confirm: '' })
    toast.add({ title: '密码已修改，其他设备已强制下线', color: 'success' })
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message ?? '修改失败', color: 'error' })
  }
  finally {
    savingPwd.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold">个人设置</h1>

    <UCard>
      <template #header>
        <h2 class="font-medium">基本资料</h2>
      </template>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <UAvatar :src="profile.avatarUrl || ''" :alt="profile.displayName || '头像'" size="2xl" />
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UButton :loading="uploadingAvatar" @click="avatarInput?.click()">
                {{ profile.avatarUrl ? '更换头像' : '上传头像' }}
              </UButton>
              <UButton v-if="profile.avatarUrl" variant="ghost" color="neutral" size="sm" @click="removeAvatar">移除</UButton>
            </div>
            <p class="text-xs text-muted">支持 JPG / PNG / WebP / GIF，不超过 2MB</p>
          </div>
          <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="onAvatarSelected" />
        </div>
        <UFormField label="用户名" help="用户名即公开主页地址，由管理员分配，不可修改">
          <UInput :model-value="user?.username" disabled class="w-full" />
        </UFormField>
        <UFormField label="显示名">
          <UInput v-model="profile.displayName" class="w-full" />
        </UFormField>
        <UFormField label="个人简介">
          <UTextarea v-model="profile.bio" :rows="3" placeholder="展示在你的公开主页…" class="w-full" />
        </UFormField>
        <UButton :loading="savingProfile" @click="saveProfile">保存资料</UButton>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="font-medium">修改密码</h2>
      </template>
      <div class="space-y-4">
        <UFormField label="当前密码">
          <UInput v-model="pwd.currentPassword" type="password" autocomplete="current-password" class="w-full" />
        </UFormField>
        <UFormField label="新密码" help="至少 8 位">
          <UInput v-model="pwd.newPassword" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <UFormField label="确认新密码">
          <UInput v-model="pwd.confirm" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <UButton :loading="savingPwd" @click="changePassword">修改密码</UButton>
      </div>
    </UCard>
  </div>
</template>
