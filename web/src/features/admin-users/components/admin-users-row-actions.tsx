import { type Row } from '@tanstack/react-table'
import { type AdminUser } from '@/services/admin-users'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminUsers } from './admin-users-provider'

type AdminUsersRowActionsProps = {
  row: Row<AdminUser>
}

/**
 * 渲染用户表格行操作按钮，按权限触发编辑和删除弹窗。
 */
export function AdminUsersRowActions({ row }: AdminUsersRowActionsProps) {
  const { setOpen, setCurrentRow } = useAdminUsers()
  const user = useAuthStore((state) => state.auth.user)

  const canEdit =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('system:admin_user:edit')
  const canDelete =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('system:admin_user:delete')

  if (!canEdit && !canDelete) {
    return null
  }

  return (
    <div className='flex justify-end gap-1 text-nowrap'>
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
