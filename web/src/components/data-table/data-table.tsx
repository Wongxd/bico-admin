import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { flexRender, type Table as TableType } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { getPinnedColumnClassName, getPinnedColumnStyle, getVisibleCellsWithPinning } from './pinning'
import { DataTablePagination } from './pagination'

interface DataTableProps<TData> {
  table: TableType<TData>
  isLoading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  className?: string
}

/**
 * 封装的通用数据表格组件。
 * 负责渲染表格结构 (TableHeader, TableBody, TableRow, TableCell)，
 * 处理列固定 (Column Pinning) 样式，以及内嵌分页器。
 */
export function DataTable<TData>({
  table,
  isLoading,
  loadingMessage = '正在加载数据...',
  emptyMessage = '暂无数据',
  className,
}: DataTableProps<TData>) {
  const columnsCount = table.getAllColumns().length

  return (
    <div className={cn('flex flex-1 flex-col gap-4', className)}>
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
                  colSpan={columnsCount}
                  className='h-24 text-center text-muted-foreground'
                >
                  {isLoading ? loadingMessage : emptyMessage}
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
