import { useAuthStore } from '@/stores/auth-store'
import { useConfigStore } from '@/stores/config-store'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { getVisibleSidebarData } from './data/sidebar-utils'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

/**
 * 侧边栏整体布局组件，渲染系统标题、分组菜单和底部当前登录用户信息。
 */
export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { auth } = useAuthStore()
  const { config } = useConfigStore()
  const visibleSidebarData = getVisibleSidebarData(sidebarData, {
    debug: config.appConfig?.debug,
  })

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {visibleSidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={auth.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
