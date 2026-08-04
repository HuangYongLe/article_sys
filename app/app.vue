<script setup lang="ts">
const config = useRuntimeConfig()

useHead({
  titleTemplate: title => (title ? `${title} · ${config.public.siteName}` : config.public.siteName),
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
