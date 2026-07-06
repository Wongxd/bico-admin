import { type SVGProps } from 'react'
import { Root as Radio, Item } from '@radix-ui/react-radio-group'
import { Settings, RotateCcw, CircleCheck } from 'lucide-react'
import { IconLayoutCompact } from '@/assets/custom/icon-layout-compact'
import { IconLayoutDefault } from '@/assets/custom/icon-layout-default'
import { IconLayoutFull } from '@/assets/custom/icon-layout-full'
import { IconSidebarFloating } from '@/assets/custom/icon-sidebar-floating'
import { IconSidebarInset } from '@/assets/custom/icon-sidebar-inset'
import { IconSidebarSidebar } from '@/assets/custom/icon-sidebar-sidebar'
import { IconThemeDark } from '@/assets/custom/icon-theme-dark'
import { IconThemeLight } from '@/assets/custom/icon-theme-light'
import { IconThemeSystem } from '@/assets/custom/icon-theme-system'
import { cn } from '@/lib/utils'
import { type Collapsible, type AuthTemplate, type ContentWidth, useLayout } from '@/context/layout-provider'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSidebar } from './ui/sidebar'

export function ConfigDrawer() {
  const { setOpen } = useSidebar()
  const { resetTheme } = useTheme()
  const { resetLayout } = useLayout()

  const handleReset = () => {
    setOpen(true)
    resetTheme()
    resetLayout()
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size='icon'
          variant='ghost'
          aria-label='打开主题设置'
          className='rounded-full'
        >
          <Settings aria-hidden='true' />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex flex-col'>
        <SheetHeader className='pb-0 text-start'>
          <SheetTitle>主题设置</SheetTitle>
          <SheetDescription>
            调整视觉外观与布局选项以匹配您的喜好。
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-2 pb-6'>
          <ThemeConfig />
          <SidebarConfig />
          <LayoutConfig />
          <AuthTemplateConfig />
          <ContentWidthConfig />
        </div>
        <SheetFooter className='gap-2'>
          <Button
            variant='destructive'
            onClick={handleReset}
            aria-label='重置所有设置'
          >
            全部重置
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SectionTitle({
  title,
  showReset = false,
  onReset,
  resetAriaLabel,
  className,
}: {
  title: string
  showReset?: boolean
  onReset?: () => void
  /** Shown on the small per-section reset (RotateCcw) for accessibility and tests. */
  resetAriaLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground',
        className
      )}
    >
      {title}
      {showReset && onReset && (
        <Button
          type='button'
          size='icon'
          variant='secondary'
          className='size-4 rounded-full'
          onClick={onReset}
          aria-label={resetAriaLabel}
        >
          <RotateCcw className='size-3' />
        </Button>
      )}
    </div>
  )
}

function RadioGroupItem({
  item,
  isTheme = false,
}: {
  item: {
    value: string
    label: string
    icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement
  }
  isTheme?: boolean
}) {
  return (
    <Item
      value={item.value}
      className={cn('group outline-none', 'transition duration-200 ease-in')}
      aria-label={`选择 ${item.label}`}
      aria-describedby={`${item.value}-description`}
    >
      <div
        className={cn(
          'relative rounded-[6px] ring-[1px] ring-border',
          'group-data-[state=checked]:shadow-2xl group-data-[state=checked]:ring-primary',
          'group-focus-visible:ring-2'
        )}
        role='img'
        aria-hidden='false'
        aria-label={`${item.label} 选项预览`}
      >
        <CircleCheck
          className={cn(
            'size-6 fill-primary stroke-white',
            'group-data-[state=unchecked]:hidden',
            'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2'
          )}
          aria-hidden='true'
        />
        <item.icon
          className={cn(
            !isTheme &&
              'fill-primary stroke-primary group-data-[state=unchecked]:fill-muted-foreground group-data-[state=unchecked]:stroke-muted-foreground'
          )}
          aria-hidden='true'
        />
      </div>
      <div
        className='mt-1 text-xs'
        id={`${item.value}-description`}
        aria-live='polite'
      >
        {item.label}
      </div>
    </Item>
  )
}

function ThemeConfig() {
  const { defaultTheme, theme, setTheme } = useTheme()
  return (
    <div>
      <SectionTitle
        title='系统主题'
        showReset={theme !== defaultTheme}
        onReset={() => setTheme(defaultTheme)}
        resetAriaLabel='重置主题设置'
      />
      <Radio
        value={theme}
        onValueChange={setTheme}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label='选择主题'
        aria-describedby='theme-description'
      >
        {[
          {
            value: 'system',
            label: '跟随系统',
            icon: IconThemeSystem,
          },
          {
            value: 'light',
            label: '浅色模式',
            icon: IconThemeLight,
          },
          {
            value: 'dark',
            label: '深色模式',
            icon: IconThemeDark,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} isTheme />
        ))}
      </Radio>
      <div id='theme-description' className='sr-only'>
        在跟随系统、浅色模式或深色模式之间进行选择
      </div>
    </div>
  )
}

function SidebarConfig() {
  const { defaultVariant, variant, setVariant } = useLayout()
  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title='侧边栏风格'
        showReset={defaultVariant !== variant}
        onReset={() => setVariant(defaultVariant)}
        resetAriaLabel='重置侧边栏风格'
      />
      <Radio
        value={variant}
        onValueChange={setVariant}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label='选择侧边栏风格'
        aria-describedby='sidebar-description'
      >
        {[
          {
            value: 'inset',
            label: '内嵌模式',
            icon: IconSidebarInset,
          },
          {
            value: 'floating',
            label: '悬浮模式',
            icon: IconSidebarFloating,
          },
          {
            value: 'sidebar',
            label: '标准模式',
            icon: IconSidebarSidebar,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='sidebar-description' className='sr-only'>
        选择侧边栏内嵌、悬浮或标准侧边栏布局
      </div>
    </div>
  )
}

function LayoutConfig() {
  const { open, setOpen } = useSidebar()
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout()

  const radioState = open ? 'default' : collapsible

  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title='侧边栏布局'
        showReset={radioState !== 'default'}
        onReset={() => {
          setOpen(true)
          setCollapsible(defaultCollapsible)
        }}
        resetAriaLabel='重置侧边栏布局'
      />
      <Radio
        value={radioState}
        onValueChange={(v) => {
          if (v === 'default') {
            setOpen(true)
            return
          }
          setOpen(false)
          setCollapsible(v as Collapsible)
        }}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label='选择侧边栏布局'
        aria-describedby='layout-description'
      >
        {[
          {
            value: 'default',
            label: '默认展开',
            icon: IconLayoutDefault,
          },
          {
            value: 'icon',
            label: '紧凑图标',
            icon: IconLayoutCompact,
          },
          {
            value: 'offcanvas',
            label: '全部隐藏',
            icon: IconLayoutFull,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='layout-description' className='sr-only'>
        在默认展开、紧凑图标仅展示或全部隐藏布局模式之间进行选择
      </div>
    </div>
  )
}

function IconAuthDefault(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 80 50' xmlns='http://www.w3.org/2000/svg' {...props}>
      <rect x='0' y='0' width='80' height='50' rx='4' fill='currentColor' opacity='0.1' />
      <rect x='28' y='12' width='24' height='26' rx='2' fill='currentColor' opacity='0.6' />
      <line x1='33' y1='20' x2='47' y2='20' stroke='currentColor' strokeWidth='2' opacity='0.8' />
      <line x1='33' y1='26' x2='47' y2='26' stroke='currentColor' strokeWidth='2' opacity='0.8' />
    </svg>
  )
}

function IconAuthSplit(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 80 50' xmlns='http://www.w3.org/2000/svg' {...props}>
      <rect x='0' y='0' width='80' height='50' rx='4' fill='currentColor' opacity='0.1' />
      <rect x='0' y='0' width='35' height='50' fill='currentColor' opacity='0.4' />
      <rect x='45' y='12' width='24' height='26' rx='2' fill='currentColor' opacity='0.6' />
      <line x1='50' y1='20' x2='64' y2='20' stroke='currentColor' strokeWidth='2' opacity='0.8' />
      <line x1='50' y1='26' x2='64' y2='26' stroke='currentColor' strokeWidth='2' opacity='0.8' />
    </svg>
  )
}

function AuthTemplateConfig() {
  const { defaultAuthTemplate, authTemplate, setAuthTemplate } = useLayout()

  return (
    <div>
      <SectionTitle
        title='登录页模板'
        showReset={authTemplate !== defaultAuthTemplate}
        onReset={() => setAuthTemplate(defaultAuthTemplate)}
        resetAriaLabel='重置登录页模板'
      />
      <Radio
        value={authTemplate}
        onValueChange={(v) => setAuthTemplate(v as AuthTemplate)}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label='选择登录页模板'
        aria-describedby='auth-template-description'
      >
        {[
          {
            value: 'default',
            label: '经典居中',
            icon: IconAuthDefault,
          },
          {
            value: 'split',
            label: '双栏拆分',
            icon: IconAuthSplit,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='auth-template-description' className='sr-only'>
        在经典居中或双栏拆分登录页面模板之间进行选择
      </div>
    </div>
  )
}

function IconWidthFluid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 80 50' xmlns='http://www.w3.org/2000/svg' {...props}>
      <rect x='0' y='0' width='80' height='50' rx='4' fill='currentColor' opacity='0.1' />
      <rect x='8' y='10' width='64' height='6' rx='1' fill='currentColor' opacity='0.7' />
      <rect x='8' y='22' width='64' height='18' rx='1.5' fill='currentColor' opacity='0.4' />
    </svg>
  )
}

function IconWidthBoxed(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='0 0 80 50' xmlns='http://www.w3.org/2000/svg' {...props}>
      <rect x='0' y='0' width='80' height='50' rx='4' fill='currentColor' opacity='0.1' />
      <rect x='20' y='10' width='40' height='6' rx='1' fill='currentColor' opacity='0.7' />
      <rect x='20' y='22' width='40' height='18' rx='1.5' fill='currentColor' opacity='0.4' />
    </svg>
  )
}

function ContentWidthConfig() {
  const { defaultContentWidth, contentWidth, setContentWidth } = useLayout()

  return (
    <div>
      <SectionTitle
        title='页面内容宽度'
        showReset={contentWidth !== defaultContentWidth}
        onReset={() => setContentWidth(defaultContentWidth)}
        resetAriaLabel='重置内容宽度'
      />
      <Radio
        value={contentWidth}
        onValueChange={(v) => setContentWidth(v as ContentWidth)}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label='选择页面内容宽度'
        aria-describedby='content-width-description'
      >
        {[
          {
            value: 'fluid',
            label: '流式布局',
            icon: IconWidthFluid,
          },
          {
            value: 'boxed',
            label: '定宽布局',
            icon: IconWidthBoxed,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='content-width-description' className='sr-only'>
        在满宽流式或居中定宽内容区域之间进行选择
      </div>
    </div>
  )
}
