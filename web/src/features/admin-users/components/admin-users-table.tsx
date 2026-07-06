import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnOrderState,
  type ColumnPinningState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { getAdminUsers } from '@/services/admin-users'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTablePagination,
  DataTableToolbar,
  getPinnedColumnClassName,
  getPinnedColumnStyle,
  getVisibleCellsWithPinning,
} from '@/components/data-table'
import { adminUsersColumns as columns } from './admin-users-columns'

type AdminUsersTableProps = {
  search: Record<string, unknown>
  navigate: NavigateFn
}

const enabledFilterOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
]

const columnFilterConfig = [
  { columnId: 'username', searchKey: 'username', type: 'string' as const },
  { columnId: 'name', searchKey: 'name', type: 'string' as const },
  { columnId: 'enabled', searchKey: 'enabled', type: 'array' as const },
]

/**
 * 渲染后台用户列表，并将分页和筛选状态同步到 URL。
 */
export function AdminUsersTable({ search, navigate }: AdminUsersTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: ['select'],
  })
  const [sorting, setSorting] = useState<SortingState>([])

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

  const queryParams = useMemo(() => {
    const username = columnFilters.find(
      (filter) => filter.id === 'username'
    )?.value
    const name = columnFilters.find((filter) => filter.id === 'name')?.value
    const enabledValues = columnFilters.find(
      (filter) => filter.id === 'enabled'
    )?.value
    const enabledList = Array.isArray(enabledValues) ? enabledValues : []

    // 仅支持单列排序，取排序配置的第一项进行转换。
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
      sortField: sort ? sort.id : undefined,
      sortOrder: sort ? (sort.desc ? 'descend' : 'ascend') : undefined,
    }
  }, [columnFilters, pagination.pageIndex, pagination.pageSize, sorting])

  const usersQuery = useQuery({
    queryKey: ['admin-users', queryParams],
    queryFn: () => getAdminUsers(queryParams),
    staleTime: 0,
  })

  const users = usersQuery.data?.data.list ?? []
  const total = usersQuery.data?.data.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  // eslint-disable-next-line react-hooks/incompatible-library
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
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName,
                      getPinnedColumnClassName(header.column)
                    )}
                    style={getPinnedColumnStyle(header.column)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row'
                >
                  {getVisibleCellsWithPinning(row).map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName,
                        getPinnedColumnClassName(cell.column)
                      )}
                      style={getPinnedColumnStyle(cell.column)}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  {usersQuery.isLoading ? '正在加载用户...' : '暂无用户数据'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
