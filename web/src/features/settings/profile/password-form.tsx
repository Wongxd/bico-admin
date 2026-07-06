import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePassword } from '@/services/auth'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'

const passwordFormSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入原密码。'),
    newPassword: z.string().min(6, '新密码长度必须至少为 6 个字符。'),
    confirmPassword: z.string().min(1, '请再次输入新密码。'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的新密码不一致。',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordFormSchema>

type PasswordFormProps = {
  onSaved?: () => void
}

/**
 * 修改密码表单，校验新密码确认值并提交当前账号密码变更。
 */
export function PasswordForm({ onSaved }: PasswordFormProps) {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  })

  /**
   * 提交密码修改请求，成功后清除登录态并跳转至登录页。
   */
  async function onSubmit(data: PasswordFormValues) {
    setIsSaving(true)

    try {
      await changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      })
      toast.success('密码已修改，请重新登录')
      form.reset()
      onSaved?.()
      useAuthStore.getState().auth.reset()
      navigate({ to: '/sign-in', replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : '密码修改失败'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
        <FormField
          control={form.control}
          name='oldPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>原密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder='请输入原密码' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='newPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>新密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder='请输入新密码' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>确认新密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder='请再次输入新密码' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type='submit' disabled={isSaving}>
          {isSaving && <Loader2 className='animate-spin' />}
          保存
        </Button>
      </form>
    </Form>
  )
}
