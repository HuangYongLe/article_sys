import { nanoid } from 'nanoid'

export interface CaptchaChallenge {
  id: string
  question: string
  svg: string
  answer: string
}

const PALETTE = ['#16a34a', '#0f766e', '#15803d', '#0d9488', '#047857', '#1d4ed8']

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 生成一张带扭曲文字与噪点的 SVG 验证码图片，返回原始 SVG 标记 */
function buildSvg(text: string): string {
  const W = 248
  const H = 76
  let x = 18
  const chars: string[] = []
  for (const ch of text) {
    const y = 40 + (Math.random() * 18 - 9)
    const rot = Math.random() * 34 - 17
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
    const size = 30 + Math.random() * 10
    const glyph = ch === ' ' ? ' ' : escapeXml(ch)
    chars.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Verdana, Geneva, Tahoma, sans-serif" font-size="${size.toFixed(1)}" font-weight="700" fill="${color}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${glyph}</text>`,
    )
    x += ch === ' ' ? 16 : size * 0.62
  }

  let noise = ''
  for (let i = 0; i < 4; i++) {
    const y1 = Math.random() * H
    const y2 = Math.random() * H
    noise += `<path d="M0 ${y1.toFixed(0)} Q ${(W / 2).toFixed(0)} ${((y1 + y2) / 2).toFixed(0)} ${W} ${y2.toFixed(0)}" stroke="#16a34a" stroke-opacity="0.10" stroke-width="2" fill="none"/>`
  }
  for (let i = 0; i < 36; i++) {
    noise += `<circle cx="${(Math.random() * W).toFixed(0)}" cy="${(Math.random() * H).toFixed(0)}" r="${(Math.random() * 1.6).toFixed(1)}" fill="#16a34a" fill-opacity="0.16"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0fdf4"/><stop offset="100%" stop-color="#dcfce7"/></linearGradient></defs><rect width="${W}" height="${H}" rx="10" fill="url(#bg)"/>${noise}${chars.join('')}</svg>`
}

/** 生成一道两位数加减法人机验证题，答案仅存于服务端 cookie，前端只拿到题目与图片 */
export function issueCaptcha(): CaptchaChallenge {
  const a = Math.floor(Math.random() * 20) + 1
  const b = Math.floor(Math.random() * 20) + 1
  let question: string
  let answer: number
  if (Math.random() > 0.5) {
    answer = a + b
    question = `${a} + ${b} = ?`
  }
  else {
    const x = Math.max(a, b)
    const y = Math.min(a, b)
    answer = x - y
    question = `${x} - ${y} = ?`
  }
  return {
    id: nanoid(16),
    question,
    svg: buildSvg(question),
    answer: String(answer),
  }
}

/**
 * 校验人机验证：读取 httpOnly cookie 中的 id:answer，与提交值比对。
 * 失败（缺失/不匹配/已用）抛出 400，调用方需在解析 body 之后使用。
 * 成功后清除 cookie（一次性使用）。
 */
export function verifyCaptcha(event: any, id: string | undefined, answer: string | undefined): void {
  const cookie = getCookie(event, 'cm_captcha')
  deleteCookie(event, 'cm_captcha')
  if (!cookie || !id || !answer) {
    throw createError({ statusCode: 400, message: '请完成人机验证' })
  }
  const sep = cookie.indexOf('.')
  const cid = sep === -1 ? '' : cookie.slice(0, sep)
  const canswer = sep === -1 ? '' : cookie.slice(sep + 1)
  if (cid !== id || canswer !== answer.trim()) {
    throw createError({ statusCode: 400, message: '人机验证失败，请重新验证' })
  }
}
