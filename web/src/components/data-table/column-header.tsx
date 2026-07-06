import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
} from '@radix-ui/react-icons'
import { type Column } from '@tanstack/react-table'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type DataTableColumnHeaderProps<TData, TValue> =
  React.HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>
    title: string
  }

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const isPinned = column.getIsPinned() === 'left'
  const pinnedIcon = isPinned ? (
    <Pin
      className='ms-1 size-3.5 text-muted-foreground/70'
      aria-label='已固定'
    />
  ) : null

  if (!column.getCanSort()) {
    return (
      <div className={cn('flex items-center', className)}>
        <span>{title}</span>
        {pinnedIcon}
      </div>
    )
  }

  const handleToggle = () => {
    const isSorted = column.getIsSorted()
    if (isSorted === 'asc') {
      column.toggleSorting(true) // 升序 -> 降序
    } else if (isSorted === 'desc') {
      column.toggleSorting(undefined) // 降序 -> 不排序
    } else {
      column.toggleSorting(false) // 不排序 -> 升序
    }
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant='ghost'
        size='sm'
        className='h-8'
        onClick={handleToggle}
      >
        <span>{title}</span>
        {pinnedIcon}
        {column.getIsSorted() === 'desc' ? (
          <ArrowDownIcon className='ms-2 h-4 w-4' />
        ) : column.getIsSorted() === 'asc' ? (
          <ArrowUpIcon className='ms-2 h-4 w-4' />
        ) : (
          <CaretSortIcon className='ms-2 h-4 w-4' />
        )}
      </Button>
    </div>
  )
}
