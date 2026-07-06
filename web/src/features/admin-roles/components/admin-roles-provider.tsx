import React, { useState } from 'react'
import { type AdminRole } from '@/services/admin-roles'
import useDialogState from '@/hooks/use-dialog-state'

type AdminRolesDialogType = 'add' | 'edit' | 'delete' | 'permissions'

type AdminRolesContextType = {
  open: AdminRolesDialogType | null
  setOpen: (value: AdminRolesDialogType | null) => void
  currentRow: AdminRole | null
  setCurrentRow: React.Dispatch<React.SetStateAction<AdminRole | null>>
}

const AdminRolesContext = React.createContext<AdminRolesContextType | null>(
  null
)

/**
 * 提供角色管理页面的弹窗状态和当前选中角色，避免表格行操作逐层传参。
 */
export function AdminRolesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useDialogState<AdminRolesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<AdminRole | null>(null)

  return (
    <AdminRolesContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </AdminRolesContext>
  )
}

/**
 * 读取角色管理上下文；脱离 Provider 使用时直接抛错，便于开发期定位。
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminRoles() {
  const context = React.useContext(AdminRolesContext)

  // 没有上下文说明组件挂载位置错误，继续渲染会导致状态不可控。
  if (!context) {
    throw new Error('useAdminRoles 必须在 AdminRolesProvider 内使用')
  }

  return context
}
