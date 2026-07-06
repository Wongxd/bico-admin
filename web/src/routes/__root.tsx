import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { useConfigStore } from '@/stores/config-store'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: async () => {
    const state = useConfigStore.getState()
    // 如果 Store 里没有配置信息，则拉取后端最新配置
    if (!state.config.appConfig) {
      await state.config.fetchAppConfig()
    }
  },
  component: () => {
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={5000} />

      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
