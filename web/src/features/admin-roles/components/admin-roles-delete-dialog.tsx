import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAdminRole, type AdminRole } from '@/services/admin-roles'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'

type AdminRolesDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: AdminRole
}

/**
 * 渲染删除角色确认弹窗，用户确认后直接删除当前角色。
 */
export function AdminRolesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: AdminRolesDeleteDialogProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteAdminRole(currentRow.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success('角色已删除')
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
      title='删除角色'
      desc='确定执行删除操作吗？'
      confirmText={mutation.isPending ? '删除中...' : '删除'}
      destructive
    />
  )
}
