import { createFileRoute, redirect } from '@tanstack/react-router'
import { DemoExcel } from '@/features/developer/demo-excel'
import { useConfigStore } from '@/stores/config-store'

export const Route = createFileRoute('/_authenticated/developer/demo/excel')({
  beforeLoad: () => {
    const debug = useConfigStore.getState().config.appConfig?.debug
    if (!debug) {
      throw redirect({ to: '/403' })
    }
  },
  component: DemoExcel,
})
