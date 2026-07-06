import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminRoles } from '@/features/admin-roles'
import { useAuthStore } from '@/stores/auth-store'

const adminRolesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  name: z.string().optional().catch(''),
  code: z.string().optional().catch(''),
  enabled: z.array(z.enum(['true', 'false'])).optional().catch([]),
})

export const Route = createFileRoute('/_authenticated/system/admin-roles')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    if (
      !user?.permissions?.includes('*') &&
      !user?.permissions?.includes('system:admin_role:menu')
    ) {
      throw redirect({ to: '/403' })
    }
  },
  validateSearch: adminRolesSearchSchema,
  component: AdminRoles,
})
