import { useEffect } from 'react'
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
 * 根据当前行生成表单值，避免抽屉复用挂载实例时沿用上一次 defaultValues。
 */
function buildAdminRoleFormValues(currentRow?: AdminRole): AdminRoleForm {
  // 有当前行代表编辑模式，需要完整回填后端返回的可编辑字段。
  if (currentRow) {
    return {
      name: currentRow.name,
      code: currentRow.code,
      description: currentRow.description ?? '',
      enabled: currentRow.enabled,
      isEdit: true,
    }
  }

  // 没有当前行代表新增模式，使用空表单和默认启用状态。
  return {
    name: '',
    code: '',
    description: '',
    enabled: true,
    isEdit: false,
  }
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
    defaultValues: buildAdminRoleFormValues(currentRow),
  })
  const { reset } = form

  useEffect(() => {
    // 抽屉打开时按当前行重置表单，解决 defaultValues 只在首次挂载生效的问题。
    if (open) {
      reset(buildAdminRoleFormValues(currentRow))
    }
  }, [currentRow, open, reset])

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
        // 只在关闭时清理临时输入；打开时交给 useEffect 按当前行回填。
        if (!state) {
          form.reset(buildAdminRoleFormValues(currentRow))
        }
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
