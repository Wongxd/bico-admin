import { AdminRolesActionDrawer } from './admin-roles-action-drawer'
import { AdminRolesDeleteDialog } from './admin-roles-delete-dialog'
import { AdminRolesPermissionsDrawer } from './admin-roles-permissions-drawer'
import { useAdminRoles } from './admin-roles-provider'

/**
 * 统一挂载角色管理页面的新增、编辑、删除和权限配置弹层。
 */
export function AdminRolesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useAdminRoles()

  return (
    <>
      <AdminRolesActionDrawer
        key='admin-role-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <AdminRolesActionDrawer
            key={`admin-role-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <AdminRolesPermissionsDrawer
            key={`admin-role-permissions-${currentRow.id}`}
            open={open === 'permissions'}
            onOpenChange={() => {
              setOpen('permissions')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <AdminRolesDeleteDialog
            key={`admin-role-delete-${currentRow.id}`}
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
