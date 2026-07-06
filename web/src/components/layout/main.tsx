import { cn } from '@/lib/utils'
import { useLayout } from '@/context/layout-provider'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  fluid?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Main({ fixed, className, fluid, ...props }: MainProps) {
  const { contentWidth } = useLayout()
  const isFluid = fluid !== undefined ? fluid : contentWidth === 'fluid'

  return (
    <main
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        'px-4 py-6 w-full',

        // If layout is fixed, make the main container flex and grow
        fixed && 'flex grow flex-col overflow-hidden',

        // If layout is not fluid, set the max-width
        !isFluid &&
          '@7xl/content:mx-auto @7xl/content:max-w-7xl',
        className
      )}
      {...props}
    />
  )
}
