import { createFileRoute, redirect } from '@tanstack/react-router'
import { Dashboard } from '@/features/dashboard'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    if (
      !user?.permissions?.includes('*') &&
      !user?.permissions?.includes('dashboard:menu')
    ) {
      throw redirect({ to: '/403' })
    }
  },
  component: Dashboard,
})
