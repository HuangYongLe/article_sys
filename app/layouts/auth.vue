<script setup lang="ts">
const { public: { siteName } } = useRuntimeConfig()
</script>

<template>
  <div class="relative min-h-screen bg-default">
    <UColorModeSwitch class="fixed right-4 top-4 z-50" />

    <!-- 装饰性渐变背景（独立裁剪层，避免长表单出现横向滚动条） -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-primary/10 via-default to-primary/5" />
      <div class="absolute -left-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl" />
      <div class="absolute -bottom-32 -right-16 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
    </div>

    <div class="relative flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
      <div
        class="my-8 grid w-full max-w-4xl overflow-hidden rounded-3xl border border-default bg-elevated shadow-2xl shadow-primary/5 backdrop-blur-sm lg:grid-cols-2"
      >
        <!-- 品牌展示面板（桌面端） -->
        <aside
          class="relative hidden flex-col justify-between bg-gradient-to-br from-primary to-primary-700 p-10 text-white lg:flex"
        >
          <div>
            <div class="flex items-center gap-3">
              <div class="flex size-11 items-center justify-center rounded-2xl bg-white/15">
                <UIcon name="i-lucide-feather" class="size-6" />
              </div>
              <span class="text-lg font-semibold">{{ siteName }}</span>
            </div>

            <h2 class="mt-12 text-3xl font-bold leading-tight">
              书写、发布<br />连接你的读者
            </h2>
            <p class="mt-4 max-w-xs text-sm leading-relaxed text-white/75">
              一个为创作者打造的轻量内容发布平台，专注写作，沉淀作品。
            </p>
          </div>

          <ul class="space-y-3">
            <li class="flex items-center gap-3 text-sm text-white/90">
              <UIcon name="i-lucide-pen-line" class="size-5 shrink-0" />
              Markdown 编辑器，专注写作体验
            </li>
            <li class="flex items-center gap-3 text-sm text-white/90">
              <UIcon name="i-lucide-tags" class="size-5 shrink-0" />
              标签聚合，发现同好内容
            </li>
            <li class="flex items-center gap-3 text-sm text-white/90">
              <UIcon name="i-lucide-user-round" class="size-5 shrink-0" />
              公开主页，长期沉淀你的作品
            </li>
          </ul>

          <p class="text-xs text-white/55">
            © {{ new Date().getFullYear() }} {{ siteName }}
          </p>
        </aside>

        <!-- 表单面板 -->
        <div class="flex items-center p-8 sm:p-10">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
