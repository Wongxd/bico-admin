import { type Row } from '@tanstack/react-table'
import { type AdminRole } from '@/services/admin-roles'
import { KeyRound, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminRoles } from './admin-roles-provider'

type AdminRolesRowActionsProps = {
  row: Row<AdminRole>
}

/**
 * 渲染角色表格行操作按钮，按权限打开权限配置、编辑和删除弹窗。
 */
export function AdminRolesRowActions({ row }: AdminRolesRowActionsProps) {
  const { setOpen, setCurrentRow } = useAdminRoles()
  const user = useAuthStore((state) => state.auth.user)

  const canPermission =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('system:admin_role:permission')
  const canEdit =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('system:admin_role:edit')
  const canDelete =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('system:admin_role:delete')

  if (!canPermission && !canEdit && !canDelete) {
    return null
  }

  return (
    <div className='flex justify-end gap-1 text-nowrap'>
      {canPermission && (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('permissions')
          }}
        >
          <KeyRound />
          权限
        </Button>
      )}
      {canEdit && (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('edit')
          }}
        >
          <Pencil />
          编辑
        </Button>
      )}
      {canDelete && (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-destructive hover:text-destructive focus-visible:ring-destructive/20'
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('delete')
          }}
        >
          <Trash2 />
          删除
        </Button>
      )}
    </div>
  )
}
