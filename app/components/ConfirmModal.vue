<script setup lang="ts">
defineProps<{
  open?: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: string
  icon?: string
}>()

const emit = defineEmits<{
  close: [value: boolean]
  'update:open': [value: boolean]
}>()
</script>

<template>
  <UModal :open="open" :close="false" @update:open="(v: boolean) => emit('update:open', v)">
    <template #header>
      <div class="flex items-center gap-3">
        <span
          v-if="icon"
          class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <UIcon :name="icon" class="size-5" />
        </span>
        <h3 class="font-semibold text-lg text-highlighted">
          {{ title ?? '确认操作' }}
        </h3>
      </div>
    </template>

    <template #body>
      <p class="text-sm text-muted leading-relaxed">{{ description }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="emit('close', false)">
          {{ cancelLabel ?? '取消' }}
        </UButton>
        <UButton :color="(confirmColor as any) || 'primary'" @click="emit('close', true)">
          {{ confirmLabel ?? '确定' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
