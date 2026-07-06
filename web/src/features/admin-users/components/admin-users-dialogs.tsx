import { AdminUsersActionDrawer } from './admin-users-action-drawer'
import { AdminUsersDeleteDialog } from './admin-users-delete-dialog'
import { useAdminUsers } from './admin-users-provider'

/**
 * 统一挂载用户管理页面的新增、编辑和删除弹层。
 */
export function AdminUsersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useAdminUsers()

  return (
    <>
      <AdminUsersActionDrawer
        key='admin-user-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <AdminUsersActionDrawer
            key={`admin-user-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <AdminUsersDeleteDialog
            key={`admin-user-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
