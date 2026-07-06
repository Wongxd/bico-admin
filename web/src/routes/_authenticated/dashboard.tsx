import { createFileRoute, redirect } from '@tanstack/react-router'
import { Dashboard } from '@/features/dashboard'
import { hasPermission } from '@/lib/permissions'

export const Route = createFileRoute('/_authenticated/dashboard')({
  beforeLoad: () => {
    if (!hasPermission('dashboard:menu')) {
      throw redirect({ to: '/403' })
    }
  },
  component: Dashboard,
})
