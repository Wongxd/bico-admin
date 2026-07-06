import { createFileRoute, redirect } from '@tanstack/react-router'
import { EditorDemo } from '@/features/developer/editor-demo'
import { useConfigStore } from '@/stores/config-store'

export const Route = createFileRoute('/_authenticated/developer/demo/editor')({
  beforeLoad: () => {
    const debug = useConfigStore.getState().config.appConfig?.debug
    if (!debug) {
      throw redirect({ to: '/403' })
    }
  },
  component: EditorDemo,
})
