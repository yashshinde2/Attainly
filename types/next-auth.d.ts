import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      institutionId: string
      roleId: string
      roleKey: string
      permissions: string[]
      mustChangePassword: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    institutionId?: string
    roleId?: string
    roleKey?: string
    permissions?: string[]
    mustChangePassword?: boolean
  }
}
