import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { AdminUsersDialogs } from './components/admin-users-dialogs'
import { AdminUsersPrimaryButtons } from './components/admin-users-primary-buttons'
import { AdminUsersProvider } from './components/admin-users-provider'
import { AdminUsersTable } from './components/admin-users-table'

const route = getRouteApi('/_authenticated/system/admin-users')

/**
 * 渲染后台用户管理页面，包含工具栏、列表和操作弹层。
 */
export function AdminUsers() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  return (
    <AdminUsersProvider>
      <Header fixed>
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>用户管理</h2>
          </div>
          <AdminUsersPrimaryButtons />
        </div>
        <AdminUsersTable search={search} navigate={navigate} />
      </Main>

      <AdminUsersDialogs />
    </AdminUsersProvider>
  )
}
