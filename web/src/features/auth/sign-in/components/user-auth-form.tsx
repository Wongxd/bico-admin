import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { login, getCurrentUser, getCaptcha } from '@/services/auth'
import { saveCredentials, getCredentials, clearCredentials } from '@/lib/crypto'

// 校验登录表单的规则 schema
const formSchema = z.object({
  username: z.string().min(1, '请输入用户名。'),
  password: z.string().min(1, '请输入密码。'),
  captchaCode: z.string().length(4, '验证码必须为 4 位。'),
  rememberPassword: z.boolean().optional(),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

/**
 * 登录表单组件，处理验证码展示刷新、记住密码及登录授权逻辑。
 */
export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [captchaData, setCaptchaData] = useState<{ id: string; image: string }>({
    id: '',
    image: '',
  })
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      captchaCode: '',
      rememberPassword: false,
    },
  })

  /**
   * 异步获取最新的图形验证码
   */
  const fetchCaptcha = async () => {
    try {
      const response = await getCaptcha()
      if (response.code === 0 && response.data) {
        setCaptchaData({
          id: response.data.id,
          image: response.data.image,
        })
      }
    } catch {
      toast.error('获取验证码失败，请刷新重试')
    }
  }

  // 初始化时加载验证码，并尝试回填记住的密码
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCaptcha()
    }, 0)

    const credentials = getCredentials()
    // 如果本地存有记住的凭证，则直接填入表单
    if (credentials) {
      form.setValue('username', credentials.username)
      form.setValue('password', credentials.password)
      form.setValue('rememberPassword', true)
    }

    return () => window.clearTimeout(timer)
  }, [form])

  /**
   * 提交表单以执行登录授权
   */
  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      // 1. 调用登录 API
      const loginResponse = await login({
        username: data.username,
        password: data.password,
        captchaId: captchaData.id,
        captchaCode: data.captchaCode,
      })

      if (loginResponse.code !== 0 || !loginResponse.data?.token) {
        throw new Error(loginResponse.msg || '登录失败')
      }

      // 保存 token 到全局 Store 和 Cookie
      auth.setAccessToken(loginResponse.data.token)

      // 2. 根据是否记住密码进行本地缓存处理
      if (data.rememberPassword) {
        saveCredentials(data.username, data.password)
      } else {
        clearCredentials()
      }

      // 3. 获取当前用户信息并存入全局 Store
      const userResponse = await getCurrentUser()
      if (userResponse.code === 0 && userResponse.data) {
        auth.setUser(userResponse.data)
      }

      toast.success('登录成功！')
      
      // 4. 重定向至来源页面或首页
      const targetPath = redirectTo || '/'
      navigate({ to: targetPath, replace: true })
    } catch (error) {
      // 登录失败后，重设验证码以供用户重试
      void fetchCaptcha()
      const message = error instanceof Error ? error.message : '登录失败，请检查用户名、密码或验证码。'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder='请输入用户名' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder='请输入密码' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex items-end gap-2'>
          <div className='flex-1'>
            <FormField
              control={form.control}
              name='captchaCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>验证码</FormLabel>
                  <FormControl>
                    <Input placeholder='验证码' maxLength={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {captchaData.image && (
            <img
              src={captchaData.image}
              alt='验证码'
              onClick={fetchCaptcha}
              className='h-9 w-28 cursor-pointer rounded-md border border-input bg-background object-cover'
              title='点击刷新验证码'
            />
          )}
        </div>
        <FormField
          control={form.control}
          name='rememberPassword'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center space-x-2 space-y-0 py-1'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                记住密码
              </FormLabel>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          登录
        </Button>
      </form>
    </Form>
  )
}
