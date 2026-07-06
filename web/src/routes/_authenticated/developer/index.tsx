import { createFileRoute, redirect } from '@tanstack/react-router'
import { useConfigStore } from '@/stores/config-store'

export const Route = createFileRoute('/_authenticated/developer/')({
  beforeLoad: () => {
    const debug = useConfigStore.getState().config.appConfig?.debug
    if (!debug) {
      throw redirect({ to: '/403' })
    }
    throw redirect({ to: '/developer/api-docs' })
  },
})
