import { type Permission } from '@/services/admin-roles'

/**
 * 收集节点自身和全部后代权限 key，用于父节点勾选时批量同步子节点。
 */
export function collectPermissionKeys(permission: Permission): string[] {
  const keys = [permission.key]

  // 没有子权限时直接返回自身，避免递归空数组。
  if (!permission.children?.length) {
    return keys
  }

  for (const child of permission.children) {
    keys.push(...collectPermissionKeys(child))
  }

  return keys
}

/**
 * 收集整棵权限树的 key，用于全选、反选和批量展开时建立完整操作范围。
 */
export function collectPermissionTreeKeys(tree: Permission[]): string[] {
  const keys: string[] = []

  for (const permission of tree) {
    keys.push(...collectPermissionKeys(permission))
  }

  return keys
}

/**
 * 按权限名称过滤权限树，保留命中节点的祖先路径，保证搜索结果仍然有层级上下文。
 */
export function filterPermissionsByLabel(
  tree: Permission[],
  keyword: string
): Permission[] {
  const normalizedKeyword = keyword.trim().toLowerCase()

  // 没有搜索词时返回原树，避免创建不必要的新节点导致树状态抖动。
  if (!normalizedKeyword) {
    return tree
  }

  const filtered: Permission[] = []

  for (const permission of tree) {
    const labelMatched = permission.label
      .toLowerCase()
      .includes(normalizedKeyword)
    const children = permission.children?.length
      ? filterPermissionsByLabel(permission.children, normalizedKeyword)
      : []

    // 当前节点命中时保留完整子树；仅子节点命中时保留过滤后的子树。
    if (labelMatched) {
      filtered.push(permission)
    } else if (children.length) {
      filtered.push({ ...permission, children })
    }
  }

  return filtered
}

/**
 * 查找指定权限的父级链路，用于保存时补齐父级权限。
 */
export function findPermissionParents(
  key: string,
  tree: Permission[],
  path: string[] = []
): string[] | null {
  for (const node of tree) {
    // 命中当前节点时返回已经收集的父级路径。
    if (node.key === key) {
      return path
    }

    // 只有存在子节点时才向下查找，减少无效递归。
    if (node.children?.length) {
      const result = findPermissionParents(key, node.children, [
        ...path,
        node.key,
      ])

      // 子树命中时立即返回，避免继续遍历其他分支。
      if (result) {
        return result
      }
    }
  }

  return null
}

/**
 * 过滤被子节点覆盖的父级权限，让树组件展示更接近用户真实勾选状态。
 */
export function filterRedundantPermissions(
  permissions: string[],
  tree: Permission[]
): string[] {
  const filtered = new Set<string>()

  for (const permission of permissions) {
    const hasSelectedChild = permissions.some((other) => {
      // 自身不能作为自身的子权限判断。
      if (other === permission) {
        return false
      }

      const parents = findPermissionParents(other, tree)
      return parents?.includes(permission) ?? false
    })

    // 存在子权限时由子权限表达勾选状态，否则保留当前权限。
    if (!hasSelectedChild) {
      filtered.add(permission)
    }
  }

  return Array.from(filtered)
}

/**
 * 保存前补齐父级权限，满足后端权限校验和菜单层级判断。
 */
export function expandPermissions(
  permissions: string[],
  tree: Permission[]
): string[] {
  const expanded = new Set<string>()

  for (const permission of permissions) {
    expanded.add(permission)

    const parents = findPermissionParents(permission, tree)
    // 有父级时一并加入，确保按钮权限能带上菜单权限。
    if (parents) {
      for (const parent of parents) {
        expanded.add(parent)
      }
    }
  }

  return Array.from(expanded)
}
