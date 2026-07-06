import { useState } from 'react'
import type { CurrentUser } from '@/services/auth'
import { BadgeCheck, ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { PasswordForm } from '@/features/settings/profile/password-form'
import { ProfileForm } from '@/features/settings/profile/profile-form'

type NavUserProps = {
  user: CurrentUser | null
}

/**
 * 获取用户在界面上的主显示名称，优先使用真实姓名。
 */
function getDisplayName(user: CurrentUser | null) {
  // 未加载到用户时展示加载态文案，避免刷新页面瞬间误显示访客身份。
  if (!user) {
    return '加载中'
  }

  return user.name || user.username
}

/**
 * 生成头像兜底缩写，保证无头像用户也有可辨识标识。
 */
function getUserInitials(user: CurrentUser | null) {
  const displayName = getDisplayName(user)

  // 加载态不使用“加载中”生成缩写，避免头像内容看起来像真实姓名。
  if (!user) {
    return 'U'
  }

  return displayName.slice(0, 2).toUpperCase()
}

/**
 * 获取菜单第二行账号信息，只展示后端明确返回的字段。
 */
function getUsernameText(user: CurrentUser | null) {
  return user?.username || ''
}

/**
 * 侧边栏用户菜单，展示当前用户资料并提供个人信息、修改密码和退出入口。
 */
export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const displayName = getDisplayName(user)
  const username = getUsernameText(user)
  const initials = getUserInitials(user)

  return (
    <>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>个人信息</DialogTitle>
          </DialogHeader>
          <ProfileForm onSaved={() => setProfileOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <PasswordForm onSaved={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>

      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <Avatar className='h-8 w-8 rounded-full'>
                  <AvatarImage src={user?.avatar} alt={displayName} />
                  <AvatarFallback className='rounded-full'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>{displayName}</span>
                  {username && (
                    <span className='truncate text-xs'>{username}</span>
                  )}
                </div>
                <ChevronsUpDown className='ms-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-start text-sm'>
                  <Avatar className='h-8 w-8 rounded-full'>
                    <AvatarImage src={user?.avatar} alt={displayName} />
                    <AvatarFallback className='rounded-full'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate font-semibold'>
                      {displayName}
                    </span>
                    {username && (
                      <span className='truncate text-xs'>{username}</span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                  <BadgeCheck />
                  个人信息
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
                  <KeyRound />
                  修改密码
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => setOpen(true)}
              >
                <LogOut />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
