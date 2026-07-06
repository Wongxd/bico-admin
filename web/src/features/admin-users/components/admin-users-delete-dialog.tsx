import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAdminUser, type AdminUser } from '@/services/admin-users'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'

type AdminUsersDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: AdminUser
}

/**
 * 渲染删除用户确认弹窗，用户确认后直接删除当前行数据。
 */
export function AdminUsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: AdminUsersDeleteDialogProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteAdminUser(currentRow.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('用户已删除')
      onOpenChange(false)
    },
  })

  /**
   * 执行删除请求，确认弹窗本身已经承载二次确认。
   */
  const handleDelete = () => {
    mutation.mutate()
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      isLoading={mutation.isPending}
      title='删除用户'
      desc='确定执行删除操作吗？'
      confirmText={mutation.isPending ? '删除中...' : '删除'}
      destructive
    />
  )
}
