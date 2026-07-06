import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminUsers } from './admin-users-provider'

/**
 * 渲染用户管理页面主操作按钮。
 */
export function AdminUsersPrimaryButtons() {
  const { setOpen } = useAdminUsers()
  const user = useAuthStore((state) => state.auth.user)

  if (
    !user?.permissions?.includes('*') &&
    !user?.permissions?.includes('system:admin_user:create')
  ) {
    return null
  }

  return (
    <Button className='space-x-1' onClick={() => setOpen('add')}>
      <span>新增用户</span>
      <UserPlus size={18} />
    </Button>
  )
}
