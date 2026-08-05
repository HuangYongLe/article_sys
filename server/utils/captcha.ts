import { nanoid } from 'nanoid'

// 滑块拼图人机验证：服务端只持有"正确位置"，前端拿到几何参数用于绘制，
// 提交时回传滑块最终 x 坐标，服务端校验与正确位置的偏差是否在容差内。

export const CAPTCHA_WIDTH = 320
export const CAPTCHA_HEIGHT = 180
export const CAPTCHA_PIECE = 44
export const CAPTCHA_TOLERANCE = 6

export interface CaptchaChallenge {
  id: string
  targetX: number
  y: number
  width: number
  height: number
  pieceSize: number
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function issueCaptcha(): CaptchaChallenge {
  // 正确位置需留出从左侧拖到该处的行程，且拼图块不能越界
  const minX = CAPTCHA_PIECE + 12
  const maxX = CAPTCHA_WIDTH - CAPTCHA_PIECE - 2
  const targetX = randInt(minX, maxX)
  const minY = 8
  const maxY = CAPTCHA_HEIGHT - CAPTCHA_PIECE - 8
  const y = randInt(minY, maxY)
  return {
    id: nanoid(16),
    targetX,
    y,
    width: CAPTCHA_WIDTH,
    height: CAPTCHA_HEIGHT,
    pieceSize: CAPTCHA_PIECE,
  }
}

/**
 * 校验人机验证：读取 httpOnly cookie 中的 id:targetX，与提交的坐标比对。
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
  const ctarget = sep === -1 ? '' : cookie.slice(sep + 1)
  if (cid !== id) {
    throw createError({ statusCode: 400, message: '人机验证已失效，请重新验证' })
  }
  const diff = Math.abs(Number(answer) - Number(ctarget))
  if (!Number.isFinite(diff) || diff > CAPTCHA_TOLERANCE) {
    throw createError({ statusCode: 400, message: '人机验证失败，请重新验证' })
  }
}
