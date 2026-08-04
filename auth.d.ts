// nuxt-auth-utils 会话数据类型声明
declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    role: 'super_admin' | 'author'
    displayName: string
    avatarUrl: string | null
    /** 密码修改/账号被重置后递增，用于强制失效旧会话 */
    tokenVersion: number
    mustChangePassword: boolean
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
