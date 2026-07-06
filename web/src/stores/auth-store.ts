import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { type CurrentUser } from '@/services/auth'

const ACCESS_TOKEN = 'token'

interface AuthState {
  auth: {
    user: CurrentUser | null
    setUser: (user: CurrentUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

/**
 * 认证状态管理 Store，用于保存用户信息和 Token，并支持持久化。
 */
export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = getCookie(ACCESS_TOKEN)
  const initToken = cookieState ? JSON.parse(cookieState) : ''
  return {
    auth: {
      user: null,
      /**
       * 更新当前登录用户的信息。
       */
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      /**
       * 设置用户的 Access Token 并持久化保存到 Cookie。
       */
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      /**
       * 清除持久化保存的 Access Token。
       */
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      /**
       * 重置认证状态，同时清空用户信息和 Access Token。
       */
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
