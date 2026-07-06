import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  getCurrentUser,
  type CurrentUser,
  updateProfile,
  uploadAvatar,
} from '@/services/auth'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const profileFormSchema = z.object({
  name: z
    .string('请输入姓名。')
    .min(2, '姓名长度必须至少为 2 个字符。')
    .max(30, '姓名长度不能超过 30 个字符。'),
  avatar: z.union([z.literal(''), z.url('头像无效，请重新上传。')]),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

type ProfileFormProps = {
  onSaved?: () => void
}

/**
 * 将后端用户资料转换为表单值，只包含当前弹窗允许修改的字段。
 */
function buildProfileValues(user: CurrentUser | null): ProfileFormValues {
  return {
    name: user?.name || user?.username || '',
    avatar: user?.avatar || '',
  }
}

/**
 * 生成头像兜底缩写，头像为空或加载失败时仍能识别当前用户。
 */
function getUserInitials(user: CurrentUser | null) {
  const displayName = user?.name || user?.username

  // 用户资料未同步完成时，用稳定占位避免头像区域空白。
  if (!displayName) {
    return 'U'
  }

  return displayName.slice(0, 2).toUpperCase()
}

/**
 * 个人信息表单，负责更新当前用户的头像和名称。
 */
export function ProfileForm({ onSaved }: ProfileFormProps) {
  const { auth } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const values = useMemo(() => buildProfileValues(auth.user), [auth.user])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values,
    mode: 'onChange',
  })
  const avatarPreview = useWatch({
    control: form.control,
    name: 'avatar',
  })

  /**
   * 重新拉取当前用户资料，保证侧边栏菜单立即展示最新头像和名称。
   */
  async function refreshCurrentUser() {
    const response = await getCurrentUser()

    // 接口返回有效用户时才同步 Store，避免空响应覆盖登录态。
    if (response.code === 0 && response.data) {
      auth.setUser(response.data)
    }
  }

  /**
   * 保存头像和名称到后端。
   */
  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true)

    try {
      await updateProfile({
        name: data.name.trim(),
        avatar: data.avatar.trim(),
      })
      await refreshCurrentUser()
      toast.success('个人信息已更新')
      onSaved?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新失败'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * 上传头像文件并把返回地址写入表单，保存时与名称一起提交。
   */
  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    // 用户取消选择时不改变当前头像。
    if (!file) {
      return
    }

    setIsUploading(true)

    try {
      const response = await uploadAvatar(file)

      // 上传成功后回填预览，等待用户点击保存确认。
      if (response.code === 0 && response.data?.url) {
        form.setValue('avatar', response.data.url, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '头像上传失败'
      toast.error(message)
    } finally {
      event.target.value = ''
      setIsUploading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
        <div className='flex flex-col items-center sm:items-start gap-4'>
          <div className='flex items-center gap-4'>
            <label className='relative flex size-16 cursor-pointer items-center justify-center rounded-full border border-border bg-muted overflow-hidden group hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'>
              <Avatar className='size-full rounded-none'>
                <AvatarImage src={avatarPreview} alt='当前用户头像' />
                <AvatarFallback className='rounded-none text-base font-semibold'>
                  {getUserInitials(auth.user)}
                </AvatarFallback>
              </Avatar>

              {/* 悬停时的遮罩和图标 */}
              <div
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity',
                  isUploading && 'opacity-100 bg-black/60 pointer-events-none'
                )}
              >
                {isUploading ? (
                  <Loader2 className='animate-spin h-5 w-5' />
                ) : (
                  <>
                    <Camera className='h-4 w-4 mb-0.5' />
                    <span className='text-[10px] scale-90'>修改</span>
                  </>
                )}
              </div>

              <Input
                type='file'
                accept='image/*'
                aria-label='上传头像'
                className='sr-only'
                disabled={isUploading}
                onChange={handleAvatarChange}
              />
            </label>
            <div>
              <p className='text-sm font-medium'>头像</p>
              <p className='text-xs text-muted-foreground mt-0.5'>
                点击头像可以重新上传图片
              </p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>姓名</FormLabel>
              <FormControl>
                <Input placeholder='请输入姓名' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type='submit' disabled={isSaving || isUploading || !auth.user}>
          {isSaving && <Loader2 className='animate-spin' />}
          保存
        </Button>
      </form>
    </Form>
  )
}
