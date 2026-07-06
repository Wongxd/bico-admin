import { type ColumnDef } from '@tanstack/react-table'
import { type AdminUser } from '@/services/admin-users'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { AdminUsersRowActions } from './admin-users-row-actions'

/**
 * 根据用户名称生成头像兜底文字，头像缺失时仍可识别用户。
 */
function getUserInitials(user: AdminUser) {
  const displayName = user.name || user.username

  // 名称不存在时使用稳定占位，避免头像区域空白。
  if (!displayName) {
    return 'U'
  }

  return displayName.slice(0, 2).toUpperCase()
}

/**
 * 用户表格列定义，复刻旧版用户名、头像、姓名、角色、状态和创建时间。
 */
export const adminUsersColumns: ColumnDef<AdminUser>[] = [
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

      // 没有关联角色时展示占位，保持表格扫描稳定。
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

      // 兼容旧数据缺少创建时间的情况。
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
    cell: AdminUsersRowActions,
    enablePinning: false,
  },
]
