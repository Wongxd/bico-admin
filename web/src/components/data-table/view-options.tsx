import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { moveColumnHeader, toggleColumnLeftPinning } from './pinning'

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>
}

/**
 * 渲染表格列显隐菜单，菜单文案优先使用列配置提供的业务列名。
 */
export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='ms-auto hidden h-8 lg:flex'
        >
          <MixerHorizontalIcon className='size-4' />
          显示列
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuLabel>列设置</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllLeafColumns()
          .filter((column) => column.columnDef.meta?.label)
          .map((column) => {
            const label = column.columnDef.meta?.label ?? column.id
            const isPinned = column.getIsPinned() === 'left'
            const isVisible = column.getIsVisible()

            return (
              <div key={column.id} className='flex items-center gap-1'>
                <div
                  className={cn(
                    'flex min-h-8 min-w-0 flex-1 items-center px-2 text-sm capitalize',
                    !isVisible && 'text-muted-foreground'
                  )}
                >
                  <span className='truncate'>{label}</span>
                </div>
                <div className='flex shrink-0 items-center gap-0.5 pe-1'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    title='前移'
                    aria-label={`${label}前移`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      moveColumnHeader(table, column.id, 'left')
                    }}
                  >
                    <ArrowUp className='size-3.5 text-muted-foreground/70' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    title='后移'
                    aria-label={`${label}后移`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      moveColumnHeader(table, column.id, 'right')
                    }}
                  >
                    <ArrowDown className='size-3.5 text-muted-foreground/70' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    title={isPinned ? '取消固定' : '固定'}
                    aria-label={isPinned ? `取消固定${label}` : `固定${label}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()

                      // 部分业务列禁止固定，按钮保留用于对齐，但遵守列配置不执行固定。
                      if (!column.getCanPin()) {
                        return
                      }

                      toggleColumnLeftPinning(table, column)
                    }}
                  >
                    {isPinned ? (
                      <PinOff className='size-3.5 text-muted-foreground/70' />
                    ) : (
                      <Pin className='size-3.5 text-muted-foreground/70' />
                    )}
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    title={isVisible ? '隐藏' : '显示'}
                    aria-label={isVisible ? `隐藏${label}` : `显示${label}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()

                      // 不可隐藏列只展示统一操作入口，不改变可见性约束。
                      if (!column.getCanHide()) {
                        return
                      }

                      column.toggleVisibility(!isVisible)
                    }}
                  >
                    {isVisible ? (
                      <Eye className='size-3.5 text-muted-foreground/70' />
                    ) : (
                      <EyeOff className='size-3.5 text-muted-foreground/70' />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
