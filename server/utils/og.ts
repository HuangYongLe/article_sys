import { Resvg, initWasm } from '@resvg/resvg-wasm'
import { readFileSync } from 'node:fs'
import { createRequire, type NodeRequire } from 'node:module'

// Lazy require so module evaluation never calls createRequire with the
// placeholder `file:///_entry.js` URL that Nitro's prerender worker injects
// for `import.meta.url` (which createRequire rejects). In dev/prod we use the
// real module URL; in the prerender worker we fall back to process.cwd().
let req: NodeRequire | null = null
function getRequire(): NodeRequire {
  if (req) return req
  const metaUrl =
    (globalThis as { _importMeta_?: { url?: string } })._importMeta_?.url
    || (typeof import.meta !== 'undefined' ? import.meta.url : undefined)
  const base =
    metaUrl && metaUrl.startsWith('file://') && !metaUrl.includes('_entry.js')
      ? metaUrl
      : process.cwd() + '/'
  req = createRequire(base)
  return req
}

let wasmReady: Promise<void> | null = null
function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasmPath = getRequire().resolve('@resvg/resvg-wasm/index_bg.wasm')
      await initWasm(readFileSync(wasmPath))
    })()
  }
  return wasmReady
}

const FONT = "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'SimHei', 'Noto Sans CJK SC', sans-serif"

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

function isCJK(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0
  return (code >= 0x4e00 && code <= 0x9fff)
    || (code >= 0x3000 && code <= 0x30ff)
    || (code >= 0xff00 && code <= 0xffef)
}

function estimateWidth(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) w += isCJK(ch) ? fontSize : fontSize * 0.55
  return w
}

function wrapText(text: string, maxWidth: number, fontSize: number, maxLines = 3): string[] {
  const lines: string[] = []
  let cur = ''
  for (const ch of text) {
    const test = cur + ch
    if (estimateWidth(test, fontSize) > maxWidth && cur.length > 0) {
      lines.push(cur)
      cur = ch
      if (lines.length === maxLines - 1) break
    }
    else {
      cur = test
    }
  }
  if (cur.length > 0 && lines.length < maxLines) lines.push(cur)
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1]
    while (estimateWidth(last + '…', fontSize) > maxWidth && last.length > 0) last = last.slice(0, -1)
    lines[maxLines - 1] = last + '…'
  }
  return lines
}

export interface OgOptions {
  title: string
  subtitle?: string
  brand?: string
  meta?: string
  tags?: string[]
  accent?: string
}

const ogCache = new Map<string, { buf: Buffer, ts: number }>()

export async function renderOgImageCached(key: string, opts: OgOptions, ttlMs = 86_400_000): Promise<Buffer> {
  const hit = ogCache.get(key)
  if (hit && Date.now() - hit.ts < ttlMs) return hit.buf
  const buf = await renderOgImage(opts)
  ogCache.set(key, { buf, ts: Date.now() })
  if (ogCache.size > 200) {
    const oldest = [...ogCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
    if (oldest) ogCache.delete(oldest[0])
  }
  return buf
}

export async function renderOgImage(opts: OgOptions): Promise<Buffer> {
  await ensureWasm()
  const W = 1200
  const H = 630
  const accent = opts.accent || '#2563eb'
  const brand = opts.brand || '文章发布平台'

  const titleLines = wrapText(opts.title || '', 1040, 62, 3)
  const titleSvg = titleLines.map((line, i) =>
    `<text x="64" y="${296 + i * 82}" font-family="${FONT}" font-size="62" font-weight="700" fill="#f8fafc">${escapeXml(line)}</text>`,
  ).join('')

  const subY = 296 + titleLines.length * 82 + 6
  const subtitleSvg = opts.subtitle
    ? `<text x="64" y="${subY}" font-family="${FONT}" font-size="30" fill="#cbd5e1">${escapeXml(wrapText(opts.subtitle, 1040, 30, 1)[0] || '')}</text>`
    : ''

  const tagY = subY + (opts.subtitle ? 44 : 0) + 18
  const tagSvg = (opts.tags || []).slice(0, 4).map((t, i) => {
    const label = `#${t}`
    const tw = estimateWidth(label, 26) + 36
    const x = 64 + i * (tw + 12)
    return `<rect x="${x}" y="${tagY}" width="${tw}" height="40" rx="20" fill="${accent}" fill-opacity="0.18"/>`
      + `<text x="${x + 18}" y="${tagY + 27}" font-family="${FONT}" font-size="26" fill="${accent}">${escapeXml(label)}</text>`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.12" r="0.7">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.30"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="10" height="${H}" fill="${accent}"/>
  <text x="64" y="92" font-family="${FONT}" font-size="30" font-weight="600" fill="${accent}">${escapeXml(brand)}</text>
  ${titleSvg}
  ${subtitleSvg}
  ${tagSvg}
  <text x="64" y="${H - 56}" font-family="${FONT}" font-size="28" fill="#94a3b8">${escapeXml(opts.meta || '')}</text>
</svg>`

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { loadSystemFonts: true, defaultFontFamily: 'Microsoft YaHei' },
  })
  return Buffer.from(resvg.render().asPng())
}
