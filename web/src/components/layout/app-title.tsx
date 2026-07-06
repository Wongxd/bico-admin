import { Link } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import { useConfigStore } from '@/stores/config-store'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

/**
 * 侧边栏标题栏组件，渲染应用图标/名称，并点击跳转回首页。
 */
export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  const { config } = useConfigStore()
  const appName = config.appConfig?.name || 'Bico Admin'
  const appLogo = config.appConfig?.logo || ''

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='group-data-[collapsible=icon]:justify-center hover:bg-transparent active:bg-transparent'
          asChild
        >
          <Link
            to='/'
            onClick={() => setOpenMobile(false)}
            className='flex items-center gap-2 text-start text-sm leading-tight group-data-[collapsible=icon]:justify-center'
          >
            <div className='flex aspect-square size-6 shrink-0 items-center justify-center overflow-hidden'>
              {appLogo ? (
                <img
                  src={appLogo}
                  alt='logo'
                  className='size-6 object-contain'
                />
              ) : (
                <Logo className='size-6' />
              )}
            </div>
            <div className='grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'>
              <span className='truncate font-semibold'>{appName}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
