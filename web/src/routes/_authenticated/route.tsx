import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { getCurrentUser } from '@/services/auth'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const token = useAuthStore.getState().auth.accessToken
    // 如果没有 Token，抛出重定向异常，并携带当前页面地址以便登录后跳回
    if (!token) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }

    // 如果有 Token 但没有用户信息，前置拉取并填充，保障子路由权限校验有效。
    const user = useAuthStore.getState().auth.user
    if (!user) {
      const response = await getCurrentUser()
      if (response.code === 0 && response.data) {
        useAuthStore.getState().auth.setUser(response.data)
      } else {
        useAuthStore.getState().auth.reset()
        throw redirect({
          to: '/sign-in',
          search: {
            redirect: location.href,
          },
        })
      }
    }
  },
  component: AuthenticatedLayout,
})
