import { useEffect, useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnOrderState,
  type ColumnPinningState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { getAdminUsers, deleteAdminUser, type AdminUser } from '@/services/admin-users'
import { cn } from '@/lib/utils'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import useDialogState from '@/hooks/use-dialog-state'

// 布局组件
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'

// 基础 UI 组件
import { DataTable, DataTableToolbar, DataTableColumnHeader } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LongText } from '@/components/long-text'
import { Plus, Pencil, Trash2 } from 'lucide-react'

// 子抽屉
import { AdminUsersActionDrawer } from './components/admin-users-action-drawer'

const route = getRouteApi('/_authenticated/system/admin-users')

type AdminUsersDialogType = 'add' | 'edit' | 'delete'

const enabledFilterOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
]

const columnFilterConfig = [
  { columnId: 'username', searchKey: 'username', type: 'string' as const },
  { columnId: 'name', searchKey: 'name', type: 'string' as const },
  { columnId: 'enabled', searchKey: 'enabled', type: 'array' as const },
]

function getUserInitials(user: AdminUser) {
  const displayName = user.name || user.username
  if (!displayName) {
    return 'U'
  }
  return displayName.slice(0, 2).toUpperCase()
}

/**
 * 用户管理主页面。
 * 融合了表格配置、列定义、行操作以及删除框状态，
 * 重构去掉了 Context Provider 及其 7 个附属的冗余小文件。
 */
export function AdminUsers() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.auth.user)

  // 弹出层及当前操作行状态
  const [open, setOpen] = useDialogState<AdminUsersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<AdminUser | null>(null)

  // 表格表现状态
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: ['select'],
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // 权限控制
  const canAdd = user?.permissions?.includes('*') || user?.permissions?.includes('system:admin_user:add')
  const canEdit = user?.permissions?.includes('*') || user?.permissions?.includes('system:admin_user:edit')
  const canDelete = user?.permissions?.includes('*') || user?.permissions?.includes('system:admin_user:delete')

  // URL 查询与表格同步 Hook
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: columnFilterConfig,
  })

  // 查询参数转换
  const queryParams = useMemo(() => {
    const username = columnFilters.find((filter) => filter.id === 'username')?.value
    const name = columnFilters.find((filter) => filter.id === 'name')?.value
    const enabledValues = columnFilters.find((filter) => filter.id === 'enabled')?.value
    const enabledList = Array.isArray(enabledValues) ? enabledValues : []
    const sort = sorting[0]

    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      username: typeof username === 'string' && username.trim() ? username.trim() : undefined,
      name: typeof name === 'string' && name.trim() ? name.trim() : undefined,
      enabled: enabledList.length === 1 ? enabledList[0] === 'true' : undefined,
      sortField: sort ? sort.id : undefined,
      sortOrder: sort ? (sort.desc ? 'descend' : 'ascend') : undefined,
    }
  }, [columnFilters, pagination.pageIndex, pagination.pageSize, sorting])

  // React Query 获取数据
  const usersQuery = useQuery({
    queryKey: ['admin-users', queryParams],
    queryFn: () => getAdminUsers(queryParams),
    staleTime: 0,
  })

  const users = usersQuery.data?.data.list ?? []
  const total = usersQuery.data?.data.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  // 删除 Mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminUser(currentRow!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('用户已删除')
      setOpen(null)
    },
  })

  // 列属性定义
  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label='选择全部用户'
            className='translate-y-0.5'
          />
        ),
        meta: {
          className: cn(
            'inset-s-0 z-10 w-9 min-w-9 max-w-9 px-2 text-center rounded-tl-[inherit] max-md:sticky'
          ),
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='选择当前用户'
            className='translate-y-0.5'
          />
        ),
        size: 36,
        minSize: 36,
        maxSize: 36,
        enableHiding: false,
      },
      {
        accessorKey: 'username',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='用户名' />
        ),
        cell: ({ row }) => (
          <LongText className='max-w-40 ps-3'>{row.getValue('username')}</LongText>
        ),
        meta: {
          label: '用户名',
          className: cn(
            'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
            'inset-s-9 ps-0.5 max-md:sticky @4xl/content:table-cell @4xl/content:drop-shadow-none'
          ),
        },
        enableSorting: false,
      },
      {
        accessorKey: 'avatar',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='头像' />
        ),
        meta: {
          label: '头像',
        },
        cell: ({ row }) => (
          <Avatar className='size-10'>
            <AvatarImage src={row.original.avatar} alt={row.original.username} />
            <AvatarFallback>{getUserInitials(row.original)}</AvatarFallback>
          </Avatar>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='姓名' />
        ),
        meta: {
          label: '姓名',
        },
        cell: ({ row }) => (
          <LongText className='max-w-40'>{row.getValue('name') || '-'}</LongText>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'roles',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='角色' />
        ),
        meta: {
          label: '角色',
        },
        cell: ({ row }) => {
          const roles = row.original.roles ?? []
          if (!roles.length) {
            return <span className='text-muted-foreground'>-</span>
          }
          return (
            <div className='flex max-w-56 flex-wrap gap-1'>
              {roles.map((role) => (
                <Badge key={role.id} variant='secondary'>
                  {role.name}
                </Badge>
              ))}
            </div>
          )
        },
        enableSorting: false,
        enablePinning: false,
      },
      {
        accessorKey: 'enabled',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='状态' />
        ),
        meta: {
          label: '状态',
        },
        cell: ({ row }) => {
          const enabled = row.original.enabled
          return (
            <Badge
              variant='outline'
              className={cn(
                enabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300'
              )}
            >
              {enabled ? '启用' : '禁用'}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          const enabled = row.getValue<boolean>(id)
          return value.includes(String(enabled))
        },
        enableSorting: false,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='创建时间' />
        ),
        meta: {
          label: '创建时间',
        },
        cell: ({ row }) => {
          const value = row.original.created_at
          if (!value) {
            return <span className='text-muted-foreground'>-</span>
          }
          return (
            <span className='text-nowrap'>{new Date(value).toLocaleString()}</span>
          )
        },
        enableSorting: true,
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          if (!canEdit && !canDelete) {
            return null
          }
          return (
            <div className='flex justify-end gap-1 text-nowrap'>
              {canEdit && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setCurrentRow(row.original)
                    setOpen('edit')
                  }}
                >
                  <Pencil className='size-4 mr-1' />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='text-destructive hover:text-destructive focus-visible:ring-destructive/20'
                  onClick={() => {
                    setCurrentRow(row.original)
                    setOpen('delete')
                  }}
                >
                  <Trash2 className='size-4 mr-1' />
                  删除
                </Button>
              )}
            </div>
          )
        },
        enablePinning: false,
      },
    ],
    [canEdit, canDelete, setOpen, setCurrentRow]
  )

  // React Table 初始化
  const table = useReactTable({
    data: users,
    columns,
    pageCount,
    state: {
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
      columnOrder,
      columnPinning,
      sorting,
    },
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
  })

  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [ensurePageInRange, pageCount])

  return (
    <>
      <Header fixed>
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>用户管理</h2>
          </div>
          {canAdd && (
            <Button
              type='button'
              onClick={() => {
                setCurrentRow(null)
                setOpen('add')
              }}
              className='space-x-1'
            >
              <Plus className='size-4 mr-1' />
              <span>新增用户</span>
            </Button>
          )}
        </div>

        <div
          className={cn(
            'max-sm:has-[div[role="toolbar"]]:mb-16',
            'flex flex-1 flex-col gap-4'
          )}
        >
          <DataTableToolbar
            table={table}
            searchPlaceholder='筛选用户名...'
            searchKey='username'
            textFilters={[{ columnId: 'name', placeholder: '筛选姓名...' }]}
            filters={[
              {
                columnId: 'enabled',
                title: '状态',
                options: enabledFilterOptions,
              },
            ]}
          />
          <DataTable
            table={table}
            isLoading={usersQuery.isLoading}
            loadingMessage='正在加载用户...'
            emptyMessage='暂无用户数据'
          />
        </div>
      </Main>

      {/* 新增/编辑表单抽屉 */}
      <AdminUsersActionDrawer
        open={open === 'add' || open === 'edit'}
        onOpenChange={(v) => setOpen(v ? open : null)}
        currentRow={currentRow ?? undefined}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={open === 'delete'}
        onOpenChange={(v) => !v && setOpen(null)}
        title='确定删除用户？'
        desc={`确定删除用户 “${currentRow?.name || currentRow?.username}” 吗？此操作不可撤销。`}
        cancelBtnText='取消'
        confirmText='确定删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleteMutation.mutate()}
      />
    </>
  )
}
