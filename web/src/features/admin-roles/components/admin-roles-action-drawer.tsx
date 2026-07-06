import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createAdminRole,
  updateAdminRole,
  type AdminRole,
} from '@/services/admin-roles'
import { toast } from 'sonner'
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z
  .object({
    name: z.string().min(1, '请输入角色名称'),
    code: z.string().optional(),
    description: z.string(),
    enabled: z.boolean(),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      // 编辑时后端不允许修改 code，因此无需校验 code。
      if (data.isEdit) {
        return true
      }

      return !!data.code?.trim()
    },
    { message: '请输入角色代码', path: ['code'] }
  )

type AdminRoleForm = z.infer<typeof formSchema>

type AdminRolesActionDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: AdminRole
}

/**
 * 渲染角色新增和编辑抽屉，并根据当前模式调用创建或更新接口。
 */
export function AdminRolesActionDrawer({
  open,
  onOpenChange,
  currentRow,
}: AdminRolesActionDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow
  const form = useForm<AdminRoleForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          code: currentRow.code,
          description: currentRow.description ?? '',
          enabled: currentRow.enabled,
          isEdit,
        }
      : {
          name: '',
          code: '',
          description: '',
          enabled: true,
          isEdit,
        },
  })

  const mutation = useMutation({
    mutationFn: (values: AdminRoleForm) => {
      // 编辑模式只提交后端允许变更的字段，避免误传角色代码。
      if (isEdit && currentRow) {
        return updateAdminRole(currentRow.id, {
          name: values.name,
          description: values.description,
          enabled: values.enabled,
        })
      }

      return createAdminRole({
        name: values.name,
        code: values.code?.trim(),
        description: values.description,
        enabled: values.enabled,
        permissions: [],
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      toast.success(isEdit ? '角色已更新' : '角色已创建')
      form.reset()
      onOpenChange(false)
    },
  })

  /**
   * 提交表单数据，并交给 mutation 统一处理接口状态。
   */
  const onSubmit = (values: AdminRoleForm) => {
    mutation.mutate(values)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <SheetContent className='flex flex-col'>
        <SheetHeader className='text-start'>
          <SheetTitle>{isEdit ? '编辑角色' : '新增角色'}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            id='admin-role-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-1'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色名称</FormLabel>
                  <FormControl>
                    <Input placeholder='例如：运营管理员' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit && (
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色代码</FormLabel>
                    <FormControl>
                      <Input placeholder='例如：admin_operator' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea placeholder='说明该角色的使用范围' {...field} />
                  </FormControl>
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
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline' disabled={mutation.isPending}>
              取消
            </Button>
          </SheetClose>
          <Button
            form='admin-role-form'
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
