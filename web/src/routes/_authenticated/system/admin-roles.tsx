import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminRoles } from '@/features/admin-roles'
import { hasPermission } from '@/lib/permissions'

const adminRolesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  name: z.string().optional().catch(''),
  code: z.string().optional().catch(''),
  enabled: z.array(z.enum(['true', 'false'])).optional().catch([]),
})

export const Route = createFileRoute('/_authenticated/system/admin-roles')({
  beforeLoad: () => {
    if (!hasPermission('system:admin_role:menu')) {
      throw redirect({ to: '/403' })
    }
  },
  validateSearch: adminRolesSearchSchema,
  component: AdminRoles,
})
