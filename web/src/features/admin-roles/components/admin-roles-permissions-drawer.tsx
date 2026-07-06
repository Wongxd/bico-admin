import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  type AdminRole,
  type Permission,
} from '@/services/admin-roles'
import { ChevronRightIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  collectPermissionKeys,
  collectPermissionTreeKeys,
  expandPermissions,
  filterPermissionsByLabel,
  filterRedundantPermissions,
} from '../data/permission-utils'

type AdminRolesPermissionsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: AdminRole
}

type PermissionTreeProps = {
  permissions: Permission[]
  selectedKeys: string[]
  onSelectedKeysChange: (keys: string[]) => void
  expandedKeys: Set<string>
  onExpandedKeysChange: (keys: Set<string>) => void
  forceExpanded: boolean
  emptyText: string
}

type PermissionNodeProps = PermissionTreeProps & {
  permission: Permission
  level: number
}

type PermissionLeafGridProps = {
  permissions: Permission[]
  selectedKeys: string[]
  onSelectedKeysChange: (keys: string[]) => void
}

type CheckState = 'checked' | 'unchecked' | 'indeterminate'

/**
 * 渲染角色权限配置抽屉，并在保存时补齐父级权限后提交给后端。
 */
export function AdminRolesPermissionsDrawer({
  open,
  onOpenChange,
  currentRow,
}: AdminRolesPermissionsDrawerProps) {
  const queryClient = useQueryClient()
  const [manualSelectedKeys, setManualSelectedKeys] = useState<string[] | null>(
    null
  )
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())

  const permissionsQuery = useQuery({
    queryKey: ['admin-role-permissions-tree'],
    queryFn: getAllPermissions,
  })
  const rolePermissionsQuery = useQuery({
    queryKey: ['admin-role-permissions', currentRow.id],
    queryFn: () => getRolePermissions(currentRow.id),
    enabled: open,
  })

  const permissionTree = useMemo(
    () => permissionsQuery.data?.data ?? [],
    [permissionsQuery.data?.data]
  )
  const filteredPermissionTree = useMemo(
    () => filterPermissionsByLabel(permissionTree, searchKeyword),
    [permissionTree, searchKeyword]
  )
  const allPermissionKeys = useMemo(
    () => collectPermissionTreeKeys(permissionTree),
    [permissionTree]
  )
  const rolePermissions = useMemo(
    () =>
      rolePermissionsQuery.data?.data.permissions ??
      currentRow.permissions ??
      [],
    [currentRow.permissions, rolePermissionsQuery.data?.data.permissions]
  )
  const selectedKeys = useMemo(() => {
    // 用户手动勾选后以本地状态为准，避免接口刷新覆盖正在编辑的选择。
    if (manualSelectedKeys) {
      return manualSelectedKeys
    }

    return filterRedundantPermissions(rolePermissions, permissionTree)
  }, [manualSelectedKeys, permissionTree, rolePermissions])
  const isSearching = searchKeyword.trim() !== ''

  const mutation = useMutation({
    mutationFn: () =>
      updateRolePermissions(currentRow.id, {
        permissions: expandPermissions(selectedKeys, permissionTree),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      await queryClient.invalidateQueries({
        queryKey: ['admin-role-permissions', currentRow.id],
      })
      toast.success('权限配置成功')
      resetPermissionDraft()
      onOpenChange(false)
    },
  })

  /**
   * 清理抽屉内的临时编辑状态，确保切换角色或重新打开时从接口数据重新计算。
   */
  function resetPermissionDraft() {
    setManualSelectedKeys(null)
    setSearchKeyword('')
    setExpandedKeys(new Set())
  }

  /**
   * 关闭抽屉时清理本地勾选状态，确保下次打开重新读取当前角色权限。
   */
  const handleOpenChange = (state: boolean) => {
    // 关闭时才清理手动选择，打开过程保留当前组件初始化结果。
    if (!state) {
      resetPermissionDraft()
    }

    onOpenChange(state)
  }

  /**
   * 选中所有权限 key，用于快速授予完整权限。
   */
  const handleSelectAll = () => {
    setManualSelectedKeys(allPermissionKeys)
  }

  /**
   * 按完整权限集合反转当前勾选状态，便于批量微调角色权限。
   */
  const handleInvertSelection = () => {
    const selectedSet = new Set(selectedKeys)
    const invertedKeys = allPermissionKeys.filter(
      (key) => !selectedSet.has(key)
    )
    setManualSelectedKeys(invertedKeys)
  }

  /**
   * 展开所有拥有子节点的权限，便于用户一次性浏览完整层级。
   */
  const handleExpandAll = () => {
    setExpandedKeys(new Set(allPermissionKeys))
  }

  /**
   * 收起所有权限节点，保留顶层结构用于快速重新定位。
   */
  const handleCollapseAll = () => {
    setExpandedKeys(new Set())
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-lg'>
        <SheetHeader className='text-start'>
          <SheetTitle>配置权限</SheetTitle>
        </SheetHeader>
        <div className='space-y-3 px-4'>
          <div className='relative'>
            <SearchIcon className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder='搜索权限名称'
              aria-label='搜索权限名称'
              className='ps-9'
            />
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleSelectAll}
              disabled={!allPermissionKeys.length}
            >
              全选
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleInvertSelection}
              disabled={!allPermissionKeys.length}
            >
              反选
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleExpandAll}
              disabled={!allPermissionKeys.length}
            >
              展开全部
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleCollapseAll}
              disabled={!allPermissionKeys.length}
            >
              收起全部
            </Button>
          </div>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-1'>
          {permissionsQuery.isLoading ? (
            <div className='rounded-md border p-4 text-sm text-muted-foreground'>
              正在加载权限树...
            </div>
          ) : (
            <PermissionTree
              permissions={filteredPermissionTree}
              selectedKeys={selectedKeys}
              onSelectedKeysChange={setManualSelectedKeys}
              expandedKeys={expandedKeys}
              onExpandedKeysChange={setExpandedKeys}
              forceExpanded={isSearching}
              emptyText={isSearching ? '未找到匹配权限' : '暂无可配置权限'}
            />
          )}
        </div>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline' disabled={mutation.isPending}>
              取消
            </Button>
          </SheetClose>
          <Button
            type='button'
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || permissionsQuery.isLoading}
          >
            {mutation.isPending ? '保存中...' : '保存'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/**
 * 渲染完整权限树；空数据时显示明确状态，避免抽屉内容空白。
 */
function PermissionTree({
  permissions,
  selectedKeys,
  onSelectedKeysChange,
  expandedKeys,
  onExpandedKeysChange,
  forceExpanded,
  emptyText,
}: PermissionTreeProps) {
  // 后端未返回权限时展示空状态，避免用户误以为仍在加载。
  if (!permissions.length) {
    return (
      <div className='rounded-md border p-4 text-sm text-muted-foreground'>
        {emptyText}
      </div>
    )
  }

  return (
    <div className='space-y-1 rounded-md border p-2'>
      {permissions.map((permission) => (
        <PermissionNode
          key={permission.key}
          permission={permission}
          permissions={permissions}
          selectedKeys={selectedKeys}
          onSelectedKeysChange={onSelectedKeysChange}
          expandedKeys={expandedKeys}
          onExpandedKeysChange={onExpandedKeysChange}
          forceExpanded={forceExpanded}
          emptyText={emptyText}
          level={0}
        />
      ))}
    </div>
  )
}

/**
 * 渲染单个权限节点，并通过子节点集合计算当前节点的勾选状态。
 */
function PermissionNode({
  permission,
  permissions,
  selectedKeys,
  onSelectedKeysChange,
  expandedKeys,
  onExpandedKeysChange,
  forceExpanded,
  emptyText,
  level,
}: PermissionNodeProps) {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const childKeys = collectPermissionKeys(permission)
  const checkedCount = childKeys.filter((key) => selectedSet.has(key)).length
  const hasChildren = Boolean(permission.children?.length)
  const isExpanded = forceExpanded || expandedKeys.has(permission.key)
  const state: CheckState =
    checkedCount === childKeys.length
      ? 'checked'
      : checkedCount > 0
        ? 'indeterminate'
        : 'unchecked'

  /**
   * 同步当前节点及后代节点的勾选状态，模拟旧版树组件的父子联动。
   */
  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    const nextKeys = new Set(selectedKeys)

    // 勾选父节点时补齐所有后代，取消时移除整棵子树。
    if (checked === true) {
      for (const key of childKeys) {
        nextKeys.add(key)
      }
    } else {
      for (const key of childKeys) {
        nextKeys.delete(key)
      }
    }

    onSelectedKeysChange(Array.from(nextKeys))
  }

  /**
   * 切换当前节点展开状态；搜索模式下节点强制展开，因此不写入折叠状态。
   */
  const handleExpandedChange = (open: boolean) => {
    // 搜索时需要展示命中路径，忽略手动折叠避免隐藏搜索结果。
    if (forceExpanded) {
      return
    }

    const nextKeys = new Set(expandedKeys)

    // 展开时记录当前节点，收起时只移除当前节点，保留其他分支状态。
    if (open) {
      nextKeys.add(permission.key)
    } else {
      nextKeys.delete(permission.key)
    }

    onExpandedKeysChange(nextKeys)
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={handleExpandedChange}>
      <div
        className='flex min-h-9 items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted'
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild disabled={forceExpanded}>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-7'
              aria-label={`${isExpanded ? '收起' : '展开'} ${permission.label}`}
            >
              <ChevronRightIcon
                className={cn(
                  'size-4 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </Button>
          </CollapsibleTrigger>
        ) : (
          <span className='size-7' aria-hidden='true' />
        )}
        <label className='flex min-h-7 flex-1 cursor-pointer items-center gap-2'>
          <Checkbox
            checked={
              state === 'indeterminate' ? 'indeterminate' : state === 'checked'
            }
            onCheckedChange={handleCheckedChange}
            aria-label={`选择权限 ${permission.label}`}
          />
          <span className='min-w-0 flex-1 truncate'>{permission.label}</span>
        </label>
      </div>
      {hasChildren && (
        <CollapsibleContent>
          {/* 第二级节点的子级就是最终权限，平铺展示可以减少按钮权限的纵向滚动。 */}
          {level === 1 ? (
            <PermissionLeafGrid
              permissions={permission.children ?? []}
              selectedKeys={selectedKeys}
              onSelectedKeysChange={onSelectedKeysChange}
            />
          ) : (
            // 顶层到第二级仍保持树形结构，便于按模块展开和定位。
            permission.children?.map((child) => (
              <PermissionNode
                key={child.key}
                permission={child}
                permissions={permissions}
                selectedKeys={selectedKeys}
                onSelectedKeysChange={onSelectedKeysChange}
                expandedKeys={expandedKeys}
                onExpandedKeysChange={onExpandedKeysChange}
                forceExpanded={forceExpanded}
                emptyText={emptyText}
                level={level + 1}
              />
            ))
          )}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

/**
 * 平铺展示第三级权限，降低按钮级权限过多时的纵向空间占用。
 */
function PermissionLeafGrid({
  permissions,
  selectedKeys,
  onSelectedKeysChange,
}: PermissionLeafGridProps) {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  /**
   * 只切换当前叶子权限，避免第三级平铺项影响同组其他权限。
   */
  const handleLeafCheckedChange = (
    permission: Permission,
    checked: boolean | 'indeterminate'
  ) => {
    const nextKeys = new Set(selectedKeys)

    // 勾选时加入当前叶子权限，取消时仅移除当前叶子权限。
    if (checked === true) {
      nextKeys.add(permission.key)
    } else {
      nextKeys.delete(permission.key)
    }

    onSelectedKeysChange(Array.from(nextKeys))
  }

  return (
    <div className='ms-14 flex flex-wrap gap-1 py-1.5 pe-2'>
      {permissions.map((permission) => (
        <label
          key={permission.key}
          className='flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted'
        >
          <Checkbox
            checked={selectedSet.has(permission.key)}
            onCheckedChange={(checked) =>
              handleLeafCheckedChange(permission, checked)
            }
            aria-label={`选择权限 ${permission.label}`}
          />
          <span className='max-w-32 truncate'>{permission.label}</span>
        </label>
      ))}
    </div>
  )
}
