<script setup lang="ts">
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick, watch } from '#imports'

// 自定义 canvas 滑动拼图（不依赖任何第三方插件）。
// 行为：父页面（login/register）在用户「点击登录/提交」时才调用 verify()，
// 弹窗随后出现；用户拖动拼图块对齐全图、容差内判定通过，verify() 才 resolve
// 出 { id, answer }，由父页面带着它走登录/注册接口（服务端做最终校验）。
// 用户主动关闭弹窗则 reject({ cancelled: true })，父页面静默处理。

const W = 320
const H = 180
const PIECE = 44
const TOLERANCE = 6
const HANDLE_W = 44

const open = ref(false)
const loading = ref(false)
const verified = ref(false)
const id = ref('')
const answer = ref('')
const challenge = reactive({ targetX: 0, y: 0, pieceSize: PIECE })

const canvasRef = ref<HTMLCanvasElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)

let bgCanvas: HTMLCanvasElement | null = null

const handleFrac = ref(0) // 滑块位置 0..1
const trackWidth = ref(W)
const dragging = ref(false)
const failShake = ref(false)
const showError = ref(false)

const pieceX = computed(() => handleFrac.value * (W - PIECE))
const handleLeftPx = computed(() => {
  const maxLeft = Math.max(1, trackWidth.value - HANDLE_W)
  return handleFrac.value * maxLeft
})

const toast = useToast()

let resolveFn: ((v: { id: string, answer: string }) => void) | null = null
let rejectFn: ((e: any) => void) | null = null

let resizeObserver: ResizeObserver | null = null
let dragRect: DOMRect | null = null

function generateBackground(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const hue = Math.floor(Math.random() * 360)
  const grad = g.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, `hsl(${hue} 70% 62%)`)
  grad.addColorStop(1, `hsl(${(hue + 45) % 360} 70% 52%)`)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 7; i++) {
    g.globalAlpha = 0.16 + Math.random() * 0.22
    g.fillStyle = `hsl(${Math.floor(Math.random() * 360)} 85% 62%)`
    g.beginPath()
    g.arc(Math.random() * W, Math.random() * H, 10 + Math.random() * 26, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 0.1
  g.strokeStyle = '#ffffff'
  g.lineWidth = 1
  for (let i = 0; i <= W; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke()
  }
  for (let i = 0; i <= H; i += 16) {
    g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke()
  }
  g.globalAlpha = 1
  return c
}

// 拼图形状：顶部与右侧带凸起，左侧与底部为直边
function piecePath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const w = s * 0.2
  const cx = x + s / 2
  const cy = y + s / 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(cx - w, y)
  ctx.arc(cx, y, w, Math.PI, 2 * Math.PI, false) // 顶部凸起
  ctx.lineTo(x + s, y)
  ctx.lineTo(x + s, cy - w)
  ctx.arc(x + s, cy, w, 1.5 * Math.PI, 2.5 * Math.PI, false) // 右侧凸起
  ctx.lineTo(x + s, y + s)
  ctx.lineTo(x, y + s)
  ctx.closePath()
}

function render() {
  const canvas = canvasRef.value
  if (!canvas || !bgCanvas) return
  const dpr = window.devicePixelRatio || 1
  const pw = Math.round(W * dpr)
  const ph = Math.round(H * dpr)
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw
    canvas.height = ph
  }
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(bgCanvas, 0, 0, W, H)

  // 目标缺口（深色填充表示缺失的拼图）
  ctx.save()
  piecePath(ctx, challenge.targetX, challenge.y, challenge.pieceSize)
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.stroke()
  ctx.restore()

  const px = pieceX.value
  // 可拖动拼图块的内容（从背景对应位置裁切）
  ctx.save()
  piecePath(ctx, px, challenge.y, challenge.pieceSize)
  ctx.clip()
  ctx.drawImage(bgCanvas, px - challenge.targetX, 0, W, H)
  ctx.restore()
  // 拼图块描边与阴影
  ctx.save()
  piecePath(ctx, px, challenge.y, challenge.pieceSize)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 8
  ctx.stroke()
  ctx.restore()
}

async function fetchChallenge() {
  loading.value = true
  try {
    const res = await $fetch<{ id: string, targetX: number, y: number, pieceSize: number }>('/api/auth/captcha')
    id.value = res.id
    challenge.targetX = res.targetX
    challenge.y = res.y
    challenge.pieceSize = res.pieceSize
    handleFrac.value = 0
    bgCanvas = generateBackground()
    await nextTick()
    render()
  }
  catch {
    id.value = ''
    toast.add({ title: '验证组件加载失败，请重试', color: 'error' })
  }
  finally {
    loading.value = false
  }
}

// 弹窗内容（canvas）在 open 变为 true 后才挂载，用 rAF 兜底确保绘制一次；
// 弹窗变为关闭（点叉/ESC/点遮罩）但 verify() 尚未结算时，视为用户取消 -> reject，
// 保证父页面的 loading 一定会被复位（nuxt/ui v4 的 UModal 不发 @close 事件）。
watch(open, async (v) => {
  if (v) {
    await nextTick()
    requestAnimationFrame(() => render())
  }
  else if (resolveFn) {
    const rj = rejectFn
    resolveFn = null
    rejectFn = null
    rj?.({ cancelled: true })
  }
})

// 仅由父页面在「点击登录/提交」时调用：打开弹窗并加载题目，返回 Promise
function verify(): Promise<{ id: string, answer: string }> {
  return new Promise((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
    showError.value = false
    failShake.value = false
    verified.value = false
    open.value = true
    fetchChallenge().then(() => {
      if (!id.value) open.value = false // 加载失败 -> 关闭弹窗，watch 会 reject 取消
    })
  })
}

function refresh() {
  showError.value = false
  failShake.value = false
  fetchChallenge()
}

// 父页面登录/注册失败后调用，清理一次性状态（下次 verify 会重新拉题）
function reset() {
  id.value = ''
  answer.value = ''
  showError.value = false
  failShake.value = false
  handleFrac.value = 0
  verified.value = false
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function updateFromClientX(clientX: number) {
  if (!dragRect) return
  const maxLeft = dragRect.width - HANDLE_W
  const left = clamp(clientX - dragRect.left - HANDLE_W / 2, 0, maxLeft)
  handleFrac.value = maxLeft > 0 ? left / maxLeft : 0
  render()
}

function pointerDown(e: PointerEvent) {
  if (verified.value || loading.value) return
  const track = trackRef.value
  if (!track) return
  dragRect = track.getBoundingClientRect()
  dragging.value = true
  ;(e.target as Element).setPointerCapture?.(e.pointerId)
  updateFromClientX(e.clientX)
}

function onWindowMove(e: PointerEvent) {
  if (!dragging.value) return
  updateFromClientX(e.clientX)
}

function onWindowUp() {
  if (!dragging.value) return
  dragging.value = false
  dragRect = null
  const diff = Math.abs(pieceX.value - challenge.targetX)
  if (diff <= TOLERANCE) {
    const result = { id: id.value, answer: String(Math.round(pieceX.value)) }
    const r = resolveFn
    resolveFn = null
    rejectFn = null
    open.value = false
    r?.(result)
  }
  else {
    failShake.value = true
    showError.value = true
    setTimeout(() => (failShake.value = false), 500)
    toast.add({ title: '拼图未对齐，请重试', color: 'warning' })
    refresh()
  }
}

onMounted(() => {
  if (trackRef.value) {
    trackWidth.value = trackRef.value.clientWidth
    resizeObserver = new ResizeObserver(() => {
      if (trackRef.value) trackWidth.value = trackRef.value.clientWidth
    })
    resizeObserver.observe(trackRef.value)
  }
  window.addEventListener('pointermove', onWindowMove)
  window.addEventListener('pointerup', onWindowUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onWindowMove)
  window.removeEventListener('pointerup', onWindowUp)
  resizeObserver?.disconnect()
})

defineExpose({ verify, reset })
</script>

<template>
  <UModal v-model:open="open" title="完成人机验证" :close="!dragging">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">拖动下方滑块，将拼图块移动到缺口处完成验证。</p>
        <div class="overflow-hidden rounded-lg border border-default">
          <canvas
            ref="canvasRef"
            class="block w-full"
            :style="{ aspectRatio: `${W} / ${H}` }"
          />
        </div>

        <div
          ref="trackRef"
          class="relative h-11 w-full touch-none select-none rounded-full bg-elevated"
          :class="{ 'animate-shake': failShake }"
          @pointerdown="pointerDown"
        >
          <div
            class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-primary/15"
            :style="{ width: `calc(${handleLeftPx}px + ${HANDLE_W}px)` }"
          />
          <div
            class="absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-inverted shadow-md"
            :class="{ 'ring-2 ring-primary/50': dragging }"
            :style="{ left: `${handleLeftPx}px` }"
          >
            <UIcon name="i-lucide-chevrons-right" class="size-5" />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <p v-if="showError" class="text-xs text-warning">拼图未对齐，已自动更换题目</p>
          <span v-else />
          <UButton
            type="button"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            @click="refresh"
          >
            换一题
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
