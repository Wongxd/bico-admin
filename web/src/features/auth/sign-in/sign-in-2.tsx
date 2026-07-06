import { Logo } from '@/assets/logo'
import { useConfigStore } from '@/stores/config-store'
import { cn } from '@/lib/utils'
import { UserAuthForm } from './components/user-auth-form'

const BING_DAILY_IMAGE_URL = 'https://bing.img.run/1920x1080.php'

/**
 * 第二种风格的登录页面组件，支持双列布局及动态 Logo/标题。
 */
export function SignIn2() {
  const { config } = useConfigStore()
  const appName = config.appConfig?.name || 'Bico Admin'
  const appLogo = config.appConfig?.logo || ''
  const today = new Date()
  const bingImageVersion = [
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  ].join('-')

  return (
    <div className='relative container grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-120 sm:p-8'>
          <div className='mb-4 flex items-center justify-center gap-2'>
            {appLogo ? (
              <img
                src={appLogo}
                alt='logo'
                className='h-8 w-8 object-contain'
              />
            ) : (
              <Logo />
            )}
            <h1 className='text-xl font-medium'>{appName}</h1>
          </div>
        </div>
        <div className='mx-auto flex w-full max-w-sm flex-col justify-center space-y-2'>
          <div className='flex flex-col space-y-2 text-start'>
            <h2 className='text-lg font-semibold tracking-tight'>登录</h2>
          </div>
          <UserAuthForm />
        </div>
      </div>

      {/* 右侧使用 Bing 每日图片，日期参数用于避免浏览器长期缓存旧图。 */}
      <div
        className={cn(
          'relative h-full overflow-hidden bg-zinc-950 max-lg:hidden'
        )}
      >
        <img
          src={`${BING_DAILY_IMAGE_URL}?v=${bingImageVersion}`}
          alt='Bing 每日图片'
          className='h-full w-full object-cover'
        />
        <div className='pointer-events-none absolute inset-0 bg-black/20' />
      </div>
    </div>
  )
}
