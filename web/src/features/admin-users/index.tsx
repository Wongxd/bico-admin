import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  type ColumnOrderState,
  type ColumnPinningState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { getAllAdminRoles } from '@/services/admin-roles'
import {
  getAdminUsers,
  deleteAdminUser,
  deleteAdminUsers,
  type AdminUser,
} from '@/services/admin-users'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useHasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import useDialogState from '@/hooks/use-dialog-state'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/confirm-dialog'
// 基础 UI 组件
import {
  DataTable,
  DataTableBulkActions,
  DataTableToolbar,
  DataTableColumnHeader,
} from '@/components/data-table'
import { EnabledStatusBadge } from '@/components/enabled-status-badge'
import { Main } from '@/components/layout/main'
import { LongText } from '@/components/long-text'
import { ManagementPageHeader } from '@/components/management-page-header'
// 子抽屉
import { AdminUsersActionDrawer } from './components/admin-users-action-drawer'

const route = getRouteApi('/_authenticated/system/admin-users')

type AdminUsersDialogType = 'add' | 'edit' | 'delete' | 'deleteBatch'

const enabledFilterOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
]

const columnFilterConfig = [
  { columnId: 'username', searchKey: 'username', type: 'string' as const },
  { columnId: 'name', searchKey: 'name', type: 'string' as const },
  { columnId: 'enabled', searchKey: 'enabled', type: 'array' as const },
  { columnId: 'roles', searchKey: 'roleIds', type: 'array' as const },
]

/**
 * 判断用户是否为内置超级管理员。
 * 后端通过 is_super_admin 标识兜底超级管理员，前端只负责同步禁用删除入口。
 */
function isSuperAdminUser(user: AdminUser) {
  return !!user.is_super_admin
}

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
  const canAdd = useHasPermission('system:admin_user:create')
  const canEdit = useHasPermission('system:admin_user:edit')
  const canDelete = useHasPermission('system:admin_user:delete')

  // 角色筛选选项复用角色列表接口，只在用户管理页加载一次。
  const rolesQuery = useQuery({
    queryKey: ['admin-roles-all'],
    queryFn: getAllAdminRoles,
    staleTime: 5 * 60 * 1000,
  })

  const roleFilterOptions = useMemo(
    () =>
      (rolesQuery.data?.data ?? []).map((role) => ({
        label: role.name,
        value: String(role.id),
      })),
    [rolesQuery.data?.data]
  )

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
    const username = columnFilters.find(
      (filter) => filter.id === 'username'
    )?.value
    const name = columnFilters.find((filter) => filter.id === 'name')?.value
    const enabledValues = columnFilters.find(
      (filter) => filter.id === 'enabled'
    )?.value
    const roleValues = columnFilters.find(
      (filter) => filter.id === 'roles'
    )?.value
    const enabledList = Array.isArray(enabledValues) ? enabledValues : []
    const roleIdList = Array.isArray(roleValues) ? roleValues : []
    const sort = sorting[0]

    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      username:
        typeof username === 'string' && username.trim()
          ? username.trim()
          : undefined,
      name: typeof name === 'string' && name.trim() ? name.trim() : undefined,
      enabled: enabledList.length === 1 ? enabledList[0] === 'true' : undefined,
      role_ids: roleIdList.length > 0 ? roleIdList.join(',') : undefined,
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

  // 批量删除 Mutation
  const deleteBatchMutation = useMutation({
    mutationFn: (ids: number[]) => deleteAdminUsers(ids),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setRowSelection({})
      toast.success('用户已批量删除')
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
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='选择全部用户'
            className='translate-y-0.5'
          />
        ),
        meta: {
          className: cn(
            'inset-s-0 z-10 w-9 max-w-9 min-w-9 rounded-tl-[inherit] px-2 text-center max-md:sticky'
          ),
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
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
          <LongText className='max-w-40 ps-3'>
            {row.getValue('username')}
          </LongText>
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
            <AvatarImage
              src={row.original.avatar}
              alt={row.original.username}
            />
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
          <LongText className='max-w-40'>
            {row.getValue('name') || '-'}
          </LongText>
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
          return <EnabledStatusBadge enabled={enabled} />
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
            <span className='text-nowrap'>
              {new Date(value).toLocaleString()}
            </span>
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
          const isProtected = isSuperAdminUser(row.original)
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
                  <Pencil className='mr-1 size-4' />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  disabled={isProtected}
                  title={isProtected ? '内置超级管理员不能删除' : undefined}
                  className='text-destructive hover:text-destructive focus-visible:ring-destructive/20'
                  onClick={() => {
                    // 内置超级管理员由后端兜底保护，这里同步拦截误点。
                    if (isProtected) {
                      return
                    }
                    setCurrentRow(row.original)
                    setOpen('delete')
                  }}
                >
                  <Trash2 className='mr-1 size-4' />
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
    enableRowSelection: (row) => !isSuperAdminUser(row.original),
    getRowId: (row) => String(row.id),
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
  })

  const selectedUserIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original.id)

  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [ensurePageInRange, pageCount])

  return (
    <>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <ManagementPageHeader
          title='用户管理'
          createLabel='新增用户'
          canCreate={canAdd}
          onCreate={() => {
            setCurrentRow(null)
            setOpen('add')
          }}
        />

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
            onRefresh={() => void usersQuery.refetch()}
            isRefreshing={usersQuery.isFetching}
            textFilters={[{ columnId: 'name', placeholder: '筛选姓名...' }]}
            filters={[
              {
                columnId: 'enabled',
                title: '状态',
                options: enabledFilterOptions,
              },
              {
                columnId: 'roles',
                title: '角色',
                options: roleFilterOptions,
              },
            ]}
          />
          <DataTable
            table={table}
            isLoading={usersQuery.isLoading}
            loadingMessage='正在加载用户...'
            emptyMessage='暂无用户数据'
          />
          {canDelete && (
            <DataTableBulkActions table={table} entityName='用户'>
              <Button
                type='button'
                variant='destructive'
                size='icon'
                aria-label='批量删除用户'
                title='批量删除用户'
                onClick={() => setOpen('deleteBatch')}
              >
                <Trash2 className='size-4' />
              </Button>
            </DataTableBulkActions>
          )}
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

      {/* 批量删除确认弹窗 */}
      <ConfirmDialog
        open={open === 'deleteBatch'}
        onOpenChange={(v) => !v && setOpen(null)}
        title='确定批量删除用户？'
        desc={`确定删除选中的 ${selectedUserIds.length} 个用户吗？此操作不可撤销。`}
        cancelBtnText='取消'
        confirmText='确定删除'
        destructive
        disabled={selectedUserIds.length === 0}
        isLoading={deleteBatchMutation.isPending}
        handleConfirm={() => deleteBatchMutation.mutate(selectedUserIds)}
      />
    </>
  )
}
