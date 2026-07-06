import { type ColumnDef } from '@tanstack/react-table'
import { type AdminRole } from '@/services/admin-roles'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { AdminRolesRowActions } from './admin-roles-row-actions'

/**
 * 角色表格列定义，保持与 v2 现有数据表的选择列、状态徽标和行操作风格一致。
 */
export const adminRolesColumns: ColumnDef<AdminRole>[] = [
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

      // 后端可能在旧数据中缺少时间字段，此时展示占位符保持列宽稳定。
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
    cell: AdminRolesRowActions,
    enablePinning: false,
  },
]
