import { issueCaptcha } from '../../utils/captcha'

// 人机验证挑战：生成题目与图片，答案写入 httpOnly cookie，前端只拿到题目/图片与 id
export default defineEventHandler(async (event) => {
  const { id, question, svg, answer } = issueCaptcha()
  setCookie(event, 'cm_captcha', `${id}.${answer}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  })
  return { id, question, svg }
})
