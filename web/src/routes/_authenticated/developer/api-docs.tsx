import { createFileRoute, redirect } from '@tanstack/react-router'
import { ApiDocs } from '@/features/developer/api-docs'
import { useConfigStore } from '@/stores/config-store'

export const Route = createFileRoute('/_authenticated/developer/api-docs')({
  beforeLoad: () => {
    const debug = useConfigStore.getState().config.appConfig?.debug
    if (!debug) {
      throw redirect({ to: '/403' })
    }
  },
  component: ApiDocs,
})
