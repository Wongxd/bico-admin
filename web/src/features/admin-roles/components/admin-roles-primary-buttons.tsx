import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminRoles } from './admin-roles-provider'

/**
 * 渲染角色管理页面主操作按钮，当前仅提供新增角色入口。
 */
export function AdminRolesPrimaryButtons() {
  const { setOpen } = useAdminRoles()
  const user = useAuthStore((state) => state.auth.user)

  if (
    !user?.permissions?.includes('*') &&
    !user?.permissions?.includes('system:admin_role:create')
  ) {
    return null
  }

  return (
    <Button className='space-x-1' onClick={() => setOpen('add')}>
      <span>新增角色</span>
      <Plus size={18} />
    </Button>
  )
}
