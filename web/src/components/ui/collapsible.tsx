import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot='collapsible-trigger'
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    // 避开首次挂载时的静态渲染，挂载后再启用动画
    const timer = requestAnimationFrame(() => {
      setShouldAnimate(true)
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot='collapsible-content'
      className={cn(shouldAnimate && 'CollapsibleContent', className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
