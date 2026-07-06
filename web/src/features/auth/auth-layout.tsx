import { Logo } from '@/assets/logo'
import { useConfigStore } from '@/stores/config-store'

type AuthLayoutProps = {
  children: React.ReactNode
}

/**
 * 授权布局组件，渲染居中的卡片与动态拉取的应用名称及 Logo。
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { config } = useConfigStore()
  const appName = config.appConfig?.name || 'Bico Admin'
  const appLogo = config.appConfig?.logo || ''

  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full max-w-md flex-col justify-center space-y-2 px-4 py-8 sm:w-[400px] sm:px-0'>
        <div className='mb-4 flex items-center justify-center gap-2'>
          {appLogo ? (
            <img src={appLogo} alt='logo' className='h-8 w-8 object-contain' />
          ) : (
            <Logo />
          )}
          <h1 className='text-xl font-medium'>{appName}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
