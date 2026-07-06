import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminUsers } from '@/features/admin-users'
import { useAuthStore } from '@/stores/auth-store'

const adminUsersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  username: z.string().optional().catch(''),
  name: z.string().optional().catch(''),
  enabled: z.array(z.enum(['true', 'false'])).optional().catch([]),
})

export const Route = createFileRoute('/_authenticated/system/admin-users')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    if (
      !user?.permissions?.includes('*') &&
      !user?.permissions?.includes('system:admin_user:menu')
    ) {
      throw redirect({ to: '/403' })
    }
  },
  validateSearch: adminUsersSearchSchema,
  component: AdminUsers,
})
