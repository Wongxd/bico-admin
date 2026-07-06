import { type Row } from '@tanstack/react-table'
import { Trash2, UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type User } from '../data/schema'
import { useUsers } from './users-provider'

type DataTableRowActionsProps = {
  row: Row<User>
}

/**
 * 渲染示例用户表格行操作按钮，直接触发编辑和删除弹窗。
 */
export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useUsers()

  return (
    <div className='flex justify-end gap-1 text-nowrap'>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => {
          setCurrentRow(row.original)
          setOpen('edit')
        }}
      >
        <UserPen />
        Edit
      </Button>
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
        <Trash2 />
        Delete
      </Button>
    </div>
  )
}
