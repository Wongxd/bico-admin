import { Cross2Icon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { Download, FileDown, Loader2, RefreshCw, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTableViewOptions } from './view-options'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  textFilters?: {
    columnId: string
    placeholder: string
  }[]
  filters?: {
    columnId: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  onRefresh?: () => void
  isRefreshing?: boolean
  importAction?: {
    onClick: () => void
    isLoading?: boolean
    disabled?: boolean
    label?: string
  }
  exportAction?: {
    onClick: (selectedIds: string[]) => void
    isLoading?: boolean
    disabled?: boolean
    label?: string
  }
  templateAction?: {
    onClick: () => void
    isLoading?: boolean
    disabled?: boolean
    label?: string
  }
}

/**
 * 渲染通用表格工具栏，集中处理文本筛选、枚举筛选、重置和列显示入口。
 */
export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = '筛选...',
  searchKey,
  textFilters = [],
  filters = [],
  onRefresh,
  isRefreshing = false,
  importAction,
  exportAction,
  templateAction,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || table.getState().globalFilter
  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.id)
  const selectedCount = selectedIds.length

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        {searchKey ? (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className='h-8 w-37.5 lg:w-62.5'
          />
        ) : (
          <Input
            placeholder={searchPlaceholder}
            value={table.getState().globalFilter ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
        )}
        {textFilters.map((filter) => {
          const column = table.getColumn(filter.columnId)

          // 配置的列被隐藏或不存在时跳过，避免筛选控件写入无效状态。
          if (!column) return null

          return (
            <Input
              key={filter.columnId}
              placeholder={filter.placeholder}
              aria-label={filter.placeholder}
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(event) => column.setFilterValue(event.target.value)}
              className='h-8 w-37.5 lg:w-62.5'
            />
          )
        })}
        <div className='flex gap-x-2'>
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          })}
        </div>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
            className='h-8 px-2 lg:px-3'
          >
            重置
            <Cross2Icon className='ms-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {importAction && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8'
            disabled={importAction.disabled || importAction.isLoading}
            onClick={importAction.onClick}
          >
            {importAction.isLoading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Upload className='size-4' />
            )}
            {importAction.label ?? '导入'}
          </Button>
        )}
        {templateAction && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8'
            disabled={templateAction.disabled || templateAction.isLoading}
            onClick={templateAction.onClick}
          >
            {templateAction.isLoading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <FileDown className='size-4' />
            )}
            {templateAction.label ?? '模板'}
          </Button>
        )}
        {exportAction && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8'
            disabled={exportAction.disabled || exportAction.isLoading}
            onClick={() => exportAction.onClick(selectedIds)}
          >
            {exportAction.isLoading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Download className='size-4' />
            )}
            {exportAction.label ??
              (selectedCount > 0 ? (
                <>
                  导出选中
                  <Badge
                    variant='secondary'
                    className='ms-1 h-5 px-1.5 tabular-nums'
                  >
                    {selectedCount}
                  </Badge>
                </>
              ) : (
                '导出'
              ))}
          </Button>
        )}
        {onRefresh && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            disabled={isRefreshing}
            aria-label='刷新列表'
            title='刷新列表'
            onClick={onRefresh}
          >
            <RefreshCw
              className={cn('size-4', isRefreshing && 'animate-spin')}
            />
          </Button>
        )}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
