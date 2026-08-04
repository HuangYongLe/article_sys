<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-default px-4">
    <div class="text-center space-y-4">
      <p class="text-6xl font-bold text-highlighted">{{ error.statusCode }}</p>
      <p class="text-muted">
        {{ is404 ? '页面不存在或已被删除' : (error.statusMessage || '服务出了点问题，请稍后再试') }}
      </p>
      <UButton icon="i-lucide-home" @click="goHome">返回首页</UButton>
    </div>
  </div>
</template>
