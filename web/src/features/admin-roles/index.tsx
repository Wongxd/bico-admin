import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { AdminRolesDialogs } from './components/admin-roles-dialogs'
import { AdminRolesPrimaryButtons } from './components/admin-roles-primary-buttons'
import { AdminRolesProvider } from './components/admin-roles-provider'
import { AdminRolesTable } from './components/admin-roles-table'

const route = getRouteApi('/_authenticated/system/admin-roles')

/**
 * 渲染角色管理页面，包含顶部工具区、角色列表和所有操作弹层。
 */
export function AdminRoles() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  return (
    <AdminRolesProvider>
      <Header fixed>
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>角色管理</h2>
          </div>
          <AdminRolesPrimaryButtons />
        </div>
        <AdminRolesTable search={search} navigate={navigate} />
      </Main>

      <AdminRolesDialogs />
    </AdminRolesProvider>
  )
}
