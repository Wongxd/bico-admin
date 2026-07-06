import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ManagementPageHeaderProps = {
  title: string
  createLabel: string
  canCreate: boolean
  onCreate: () => void
}

/**
 * 渲染管理页标题和新增入口，统一两个 CRUD 页面顶部操作区的结构。
 */
export function ManagementPageHeader({
  title,
  createLabel,
  canCreate,
  onCreate,
}: ManagementPageHeaderProps) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-2'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
      </div>
      {canCreate && (
        <Button type='button' onClick={onCreate} className='space-x-1'>
          <Plus className='size-4 mr-1' />
          <span>{createLabel}</span>
        </Button>
      )}
    </div>
  )
}
