import { issueCaptcha } from '../../utils/captcha'

// 人机验证挑战：生成滑块拼图几何参数，正确位置写入 httpOnly cookie，
// 前端只拿到绘图所需参数（含正确 x，用于绘制缺口位置），提交时回传滑块坐标。
export default defineEventHandler(async (event) => {
  const { id, targetX, y, width, height, pieceSize } = issueCaptcha()
  setCookie(event, 'cm_captcha', `${id}.${targetX}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  })
  return { id, targetX, y, width, height, pieceSize }
})
