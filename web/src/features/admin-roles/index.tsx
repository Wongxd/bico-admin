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
import { getAdminRoles, deleteAdminRole, type AdminRole } from '@/services/admin-roles'
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

// 基础 Table/Dialog 组件
import { DataTable, DataTableToolbar, DataTableColumnHeader } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LongText } from '@/components/long-text'
import { Plus, KeyRound, Pencil, Trash2 } from 'lucide-react'

// 子抽屉
import { AdminRolesActionDrawer } from './components/admin-roles-action-drawer'
import { AdminRolesPermissionsDrawer } from './components/admin-roles-permissions-drawer'

const route = getRouteApi('/_authenticated/system/admin-roles')

type AdminRolesDialogType = 'add' | 'edit' | 'delete' | 'permissions'

const enabledFilterOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
]

const columnFilterConfig = [
  { columnId: 'name', searchKey: 'name', type: 'string' as const },
  { columnId: 'code', searchKey: 'code', type: 'string' as const },
  { columnId: 'enabled', searchKey: 'enabled', type: 'array' as const },
]

/**
 * 角色管理主页面。
 * 融合了表格配置 (columns)、状态流转 (Dialog/Row Selection) 和业务数据操作，
 * 极简了文件结构，不依赖 Context Provider 进行状态层层穿透。
 */
export function AdminRoles() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.auth.user)

  // 对话框和行选择状态
  const [open, setOpen] = useDialogState<AdminRolesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<AdminRole | null>(null)

  // 表格状态
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: ['select'],
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // 权限检查
  const canAdd = user?.permissions?.includes('*') || user?.permissions?.includes('system:admin_role:add')
  const canPermission = user?.permissions?.includes('*') || user?.permissions?.includes('system:admin_role:permission')
  const canEdit = user?.permissions?.includes('*') || user?.permissions?.includes('system:admin_role:edit')
  const canDelete = user?.permissions?.includes('*') || user?.permissions?.includes('system:admin_role:delete')

  // URL 状态绑定
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

  // 查询参数计算
  const queryParams = useMemo(() => {
    const name = columnFilters.find((filter) => filter.id === 'name')?.value
    const code = columnFilters.find((filter) => filter.id === 'code')?.value
    const enabledValues = columnFilters.find((filter) => filter.id === 'enabled')?.value
    const enabledList = Array.isArray(enabledValues) ? enabledValues : []
    const sort = sorting[0]

    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      name: typeof name === 'string' && name.trim() ? name.trim() : undefined,
      code: typeof code === 'string' && code.trim() ? code.trim() : undefined,
      enabled: enabledList.length === 1 ? enabledList[0] === 'true' : undefined,
      sortField: sort ? sort.id : undefined,
      sortOrder: sort ? (sort.desc ? 'descend' : 'ascend') : undefined,
    }
  }, [columnFilters, pagination.pageIndex, pagination.pageSize, sorting])

  // React Query 数据获取
  const rolesQuery = useQuery({
    queryKey: ['admin-roles', queryParams],
    queryFn: () => getAdminRoles(queryParams),
    staleTime: 0,
  })

  const roles = rolesQuery.data?.data.list ?? []
  const total = rolesQuery.data?.data.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  // 删除 Mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminRole(currentRow!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success('角色已删除')
      setOpen(null)
    },
  })

  // 表格列定义 (内聚在主组件内部，以便闭包共享 currentRow / setOpen 状态)
  const columns = useMemo<ColumnDef<AdminRole>[]>(
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
            aria-label='选择全部角色'
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
            aria-label='选择当前角色'
            className='translate-y-0.5'
          />
        ),
        size: 36,
        minSize: 36,
        maxSize: 36,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='角色名称' />
        ),
        cell: ({ row }) => (
          <LongText className='max-w-40 ps-3'>{row.getValue('name')}</LongText>
        ),
        meta: {
          label: '角色名称',
          className: cn(
            'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
            'inset-s-9 ps-0.5 max-md:sticky @4xl/content:table-cell @4xl/content:drop-shadow-none'
          ),
        },
        enableSorting: false,
      },
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='角色代码' />
        ),
        meta: {
          label: '角色代码',
        },
        cell: ({ row }) => (
          <code className='rounded bg-muted px-1.5 py-0.5 text-xs'>
            {row.getValue('code')}
          </code>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='描述' />
        ),
        meta: {
          label: '描述',
        },
        cell: ({ row }) => (
          <LongText className='max-w-64'>
            {row.getValue('description') || '-'}
          </LongText>
        ),
        enableSorting: false,
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
          if (!canPermission && !canEdit && !canDelete) {
            return null
          }
          return (
            <div className='flex justify-end gap-1 text-nowrap'>
              {canPermission && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setCurrentRow(row.original)
                    setOpen('permissions')
                  }}
                >
                  <KeyRound className='size-4 mr-1' />
                  权限
                </Button>
              )}
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
    [canPermission, canEdit, canDelete, setOpen, setCurrentRow]
  )

  // React Table 初始化
  const table = useReactTable({
    data: roles,
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
            <h2 className='text-2xl font-bold tracking-tight'>角色管理</h2>
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
              <span>新增角色</span>
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
            searchPlaceholder='筛选角色名称...'
            searchKey='name'
            textFilters={[{ columnId: 'code', placeholder: '筛选角色代码...' }]}
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
            isLoading={rolesQuery.isLoading}
            loadingMessage='正在加载角色...'
            emptyMessage='暂无角色数据'
          />
        </div>
      </Main>

      {/* 新增/编辑角色弹窗 */}
      <AdminRolesActionDrawer
        open={open === 'add' || open === 'edit'}
        onOpenChange={(v) => setOpen(v ? open : null)}
        currentRow={currentRow ?? undefined}
      />

      {/* 权限分配弹窗 */}
      {open === 'permissions' && currentRow && (
        <AdminRolesPermissionsDrawer
          open={open === 'permissions'}
          onOpenChange={(v) => setOpen(v ? 'permissions' : null)}
          currentRow={currentRow}
        />
      )}

      {/* 删除确认框 */}
      <ConfirmDialog
        open={open === 'delete'}
        onOpenChange={(v) => !v && setOpen(null)}
        title='确定删除角色？'
        desc={`删除角色 “${currentRow?.name}” 后，关联该角色的用户将失去其所有权限。此操作不可撤销。`}
        cancelBtnText='取消'
        confirmText='确定删除'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleteMutation.mutate()}
      />
    </>
  )
}
