import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type EnabledStatusBadgeProps = {
  enabled: boolean
}

/**
 * 渲染启用/禁用状态标签，统一管理页面列表中的状态视觉表达。
 */
export function EnabledStatusBadge({ enabled }: EnabledStatusBadgeProps) {
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
}
