export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  // 非超管一律 404，隐藏中控台的存在
  if (user.value?.role !== 'super_admin') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
  }
})
