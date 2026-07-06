import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { getCurrentUser } from '@/services/auth'
import { useAuthStore } from '@/stores/auth-store'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

/**
 * 已认证区域布局，负责恢复当前用户资料并渲染侧边栏内容框架。
 */
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const { auth } = useAuthStore()
  const { accessToken, setUser, user } = auth

  useEffect(() => {
    let isMounted = true

    /**
     * 刷新页面后 Store 只保留 Token，需要重新拉取用户资料供菜单和设置页展示。
     */
    async function syncCurrentUser() {
      try {
        const response = await getCurrentUser()

        // 组件卸载或接口未返回用户时不写入 Store，避免产生过期状态。
        if (!isMounted || response.code !== 0 || !response.data) {
          return
        }

        setUser(response.data)
      } catch {
        // 请求拦截器会统一处理登录过期，这里只避免布局产生未处理异常。
      }
    }

    // 已有用户资料时无需重复请求，避免菜单每次布局渲染都触发网络调用。
    if (accessToken && !user) {
      syncCurrentUser()
    }

    return () => {
      isMounted = false
    }
  }, [accessToken, setUser, user])

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SkipToMain />
      <AppSidebar />
      <SidebarInset
        className={cn(
          // 内容区声明容器上下文，供内部页面使用容器查询。
          '@container/content',

          // 固定布局需要占满视口高度，避免页面主体高度计算后产生额外滚动。
          'has-data-[layout=fixed]:h-svh',

          // inset 侧边栏带有外边距，固定布局高度需要扣除这部分空间。
          'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
        )}
      >
        {children ?? <Outlet />}
      </SidebarInset>
    </SidebarProvider>
  )
}
