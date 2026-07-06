import React, { useState } from 'react'
import { type AdminUser } from '@/services/admin-users'
import useDialogState from '@/hooks/use-dialog-state'

type AdminUsersDialogType = 'add' | 'edit' | 'delete'

type AdminUsersContextType = {
  open: AdminUsersDialogType | null
  setOpen: (value: AdminUsersDialogType | null) => void
  currentRow: AdminUser | null
  setCurrentRow: React.Dispatch<React.SetStateAction<AdminUser | null>>
}

const AdminUsersContext = React.createContext<AdminUsersContextType | null>(
  null
)

/**
 * 提供用户管理页面弹层状态和当前选中用户，供表格行操作复用。
 */
export function AdminUsersProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useDialogState<AdminUsersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<AdminUser | null>(null)

  return (
    <AdminUsersContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </AdminUsersContext>
  )
}

/**
 * 读取用户管理上下文；脱离 Provider 调用时直接抛错，避免静默失败。
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminUsers() {
  const context = React.useContext(AdminUsersContext)

  // 缺少上下文代表组件挂载位置错误，继续执行会导致弹层状态不可用。
  if (!context) {
    throw new Error('useAdminUsers 必须在 AdminUsersProvider 内使用')
  }

  return context
}
