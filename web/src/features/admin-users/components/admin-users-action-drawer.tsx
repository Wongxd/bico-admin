import { useState, type ChangeEvent, type ReactNode } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllAdminRoles } from '@/services/admin-roles'
import {
  createAdminUser,
  updateAdminUser,
  type AdminUser,
} from '@/services/admin-users'
import { uploadAvatar } from '@/services/auth'
import { Camera, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { PasswordInput } from '@/components/password-input'

const formSchema = z
  .object({
    username: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    name: z.string(),
    avatar: z.string(),
    enabled: z.boolean(),
    role_ids: z.array(z.number()),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      // 编辑时不允许修改 username，因此无需校验 username。
      if (data.isEdit) {
        return true
      }

      return !!data.username?.trim()
    },
    { message: '请输入用户名', path: ['username'] }
  )
  .refine(
    (data) => {
      // 编辑用户时密码可留空，留空代表不触发密码更新。
      if (data.isEdit) {
        return true
      }

      return !!data.password?.trim()
    },
    { message: '请输入密码', path: ['password'] }
  )
  .refine(
    (data) => {
      // 编辑用户且未填写新密码时，确认密码不参与校验。
      if (data.isEdit && !data.password?.trim()) {
        return true
      }

      return !!data.confirmPassword?.trim()
    },
    { message: '请输入确认密码', path: ['confirmPassword'] }
  )
  .refine(
    (data) => {
      // 编辑用户且未填写新密码时，不比较两个密码字段。
      if (data.isEdit && !data.password?.trim()) {
        return true
      }

      return data.password?.trim() === data.confirmPassword?.trim()
    },
    { message: '两次输入的密码不一致', path: ['confirmPassword'] }
  )

type AdminUserForm = z.infer<typeof formSchema>

type AdminUsersActionDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: AdminUser
}

/**
 * 根据用户信息生成头像兜底文字。
 */
function getUserInitials(user?: Pick<AdminUser, 'name' | 'username'>) {
  const displayName = user?.name || user?.username

  // 新建用户尚无名称时使用稳定占位。
  if (!displayName) {
    return 'U'
  }

  return displayName.slice(0, 2).toUpperCase()
}

/**
 * 生成新增用户的默认头像地址，保持和旧版随机头像行为一致。
 */
function createDefaultAvatar() {
  return `https://api.dicebear.com/9.x/thumbs/png?seed=${Math.random()}`
}

/**
 * 渲染表单必填标识，只用于当前校验规则要求用户必须填写的字段。
 */
function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className='inline-flex items-center gap-1'>
      {children}
      <span className='text-destructive' aria-hidden='true'>
        *
      </span>
    </span>
  )
}

/**
 * 渲染用户新增和编辑抽屉，并负责头像上传和角色多选。
 */
export function AdminUsersActionDrawer({
  open,
  onOpenChange,
  currentRow,
}: AdminUsersActionDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow
  const [roleComboboxOpen, setRoleComboboxOpen] = useState(false)
  const [roleSearchValue, setRoleSearchValue] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const rolesQuery = useQuery({
    queryKey: ['admin-roles-all'],
    queryFn: getAllAdminRoles,
    enabled: open,
  })

  const form = useForm<AdminUserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          username: currentRow.username,
          password: '',
          confirmPassword: '',
          name: currentRow.name ?? '',
          avatar: currentRow.avatar ?? '',
          enabled: currentRow.enabled,
          role_ids: currentRow.roles?.map((role) => role.id) ?? [],
          isEdit,
        }
      : {
          username: '',
          password: '',
          confirmPassword: '',
          name: '',
          avatar: createDefaultAvatar(),
          enabled: true,
          role_ids: [],
          isEdit,
        },
  })
  const avatarPreview = useWatch({ control: form.control, name: 'avatar' })
  const mutation = useMutation({
    mutationFn: (values: AdminUserForm) => {
      const roleIds = values.role_ids

      // 编辑时只传后端允许更新的字段，密码为空则不传。
      if (isEdit && currentRow) {
        const password = values.password?.trim()
        return updateAdminUser(currentRow.id, {
          name: values.name,
          avatar: values.avatar,
          enabled: values.enabled,
          role_ids: roleIds,
          ...(password ? { password } : {}),
        })
      }

      return createAdminUser({
        username: values.username?.trim() ?? '',
        password: values.password?.trim() ?? '',
        name: values.name,
        avatar: values.avatar,
        enabled: values.enabled,
        role_ids: roleIds,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(isEdit ? '用户已更新' : '用户已创建')
      form.reset()
      onOpenChange(false)
    },
  })

  /**
   * 上传头像后写入表单字段，最终保存时随用户资料一起提交。
   */
  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    // 用户取消选择文件时不修改当前头像。
    if (!file) {
      return
    }

    setIsUploading(true)

    try {
      const response = await uploadAvatar(file)

      // 上传成功且存在 URL 时回填头像字段。
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

  /**
   * 提交用户表单，接口调用交给 mutation 统一处理。
   */
  const onSubmit = (values: AdminUserForm) => {
    mutation.mutate(values)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(state) => {
        form.reset()
        setRoleComboboxOpen(false)
        setRoleSearchValue('')
        onOpenChange(state)
      }}
    >
      <SheetContent className='flex flex-col'>
        <SheetHeader className='text-start'>
          <SheetTitle>{isEdit ? '编辑用户' : '新增用户'}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            id='admin-user-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-1'
          >
            {!isEdit && (
              <>
                <FormField
                  control={form.control}
                  name='username'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>用户名</RequiredLabel>
                      </FormLabel>
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
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>密码</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='请输入密码' {...field} />
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
                      <FormLabel>
                        <RequiredLabel>确认密码</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder='请再次输入密码'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
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
            <FormField
              control={form.control}
              name='avatar'
              render={() => (
                <FormItem>
                  <FormLabel>头像</FormLabel>
                  <div className='flex items-center gap-4'>
                    <label className='relative flex size-16 cursor-pointer items-center justify-center rounded-full border border-border bg-muted overflow-hidden group hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'>
                      <Avatar className='size-full rounded-none'>
                        <AvatarImage src={avatarPreview} alt='用户头像' />
                        <AvatarFallback className='rounded-none text-base font-semibold'>
                          {getUserInitials(currentRow)}
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
                      <p className='text-xs text-muted-foreground'>
                        点击头像可以重新上传图片
                      </p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='role_ids'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色</FormLabel>
                  <div className='space-y-3'>
                    <Popover
                      open={roleComboboxOpen}
                      onOpenChange={(nextOpen) => {
                        setRoleComboboxOpen(nextOpen)

                        // 关闭下拉时清空筛选词，下一次打开仍展示完整可选角色。
                        if (!nextOpen) {
                          setRoleSearchValue('')
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type='button'
                            variant='outline'
                            role='combobox'
                            aria-expanded={roleComboboxOpen}
                            disabled={rolesQuery.isLoading}
                            className='w-full justify-between font-normal'
                          >
                            <span
                              className={cn(
                                'truncate',
                                !field.value.length && 'text-muted-foreground'
                              )}
                            >
                              {rolesQuery.isLoading
                                ? '正在加载角色...'
                                : (rolesQuery.data?.data.length ?? 0) > 0 &&
                                    field.value.length ===
                                      rolesQuery.data?.data.length
                                  ? '角色已全部选择'
                                  : '请选择角色'}
                            </span>
                            <ChevronsUpDown className='size-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-(--radix-popover-trigger-width) p-0'>
                        <Command>
                          <CommandInput
                            value={roleSearchValue}
                            onValueChange={setRoleSearchValue}
                            placeholder='搜索角色'
                          />
                          <CommandList>
                            <CommandEmpty>
                              {roleSearchValue
                                ? '没有匹配角色'
                                : '没有可选择角色'}
                            </CommandEmpty>
                            <CommandGroup>
                              {(rolesQuery.data?.data ?? [])
                                .filter(
                                  (role) => !field.value.includes(role.id)
                                )
                                .map((role) => (
                                  <CommandItem
                                    key={role.id}
                                    value={role.name}
                                    onSelect={() => {
                                      field.onChange([...field.value, role.id])
                                      setRoleComboboxOpen(false)
                                      setRoleSearchValue('')
                                    }}
                                  >
                                    {role.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {field.value.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {field.value.map((roleId) => {
                          const role =
                            rolesQuery.data?.data.find(
                              (item) => item.id === roleId
                            ) ??
                            currentRow?.roles?.find(
                              (item) => item.id === roleId
                            )

                          // 远程角色未返回但表单已有 ID 时，保留 ID 作为可移除标签。
                          const roleName = role?.name ?? String(roleId)

                          return (
                            <Badge
                              key={roleId}
                              variant='secondary'
                              className='gap-1'
                            >
                              {roleName}
                              <button
                                type='button'
                                aria-label={`移除角色 ${roleName}`}
                                className='rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                                onClick={() => {
                                  field.onChange(
                                    field.value.filter((id) => id !== roleId)
                                  )
                                }}
                              >
                                <X className='size-3' />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    {rolesQuery.isLoading && (
                      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                        <Loader2 className='size-4 animate-spin' />
                        正在加载角色...
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='enabled'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>状态</FormLabel>
                  <FormControl>
                    <div className='flex h-9 items-center justify-between rounded-md border px-3'>
                      <span className='text-sm'>
                        {field.value ? '启用' : '禁用'}
                      </span>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            {isEdit && (
              <>
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新密码</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='不修改请留空' {...field} />
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
                      <FormLabel>确认密码</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder='不修改请留空' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline' disabled={mutation.isPending}>
              取消
            </Button>
          </SheetClose>
          <Button
            form='admin-user-form'
            type='submit'
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '保存中...' : '保存'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
