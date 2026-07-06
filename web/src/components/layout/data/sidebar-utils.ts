import { type SidebarData, type NavGroup, type NavItem, type NavLink } from '../types'
import { canAccessPermission } from '@/lib/permissions'

type SidebarFilterOptions = {
  debug?: boolean
}

/**
 * 判断菜单项本身是否允许展示，开发者工具单独由 debug 开关控制。
 */
function canShowItem(item: NavItem, options: Required<SidebarFilterOptions>) {
  // debugOnly 菜单只在后端显式开启调试模式时展示，和 web 的 access.developer 保持一致。
  if (item.debugOnly && !options.debug) {
    return false
  }

  return canAccessPermission(item.access)
}

/**
 * 递归过滤菜单树，父级无可见子菜单时一并隐藏。
 */
function filterNavItem(
  item: NavItem,
  options: Required<SidebarFilterOptions>
): NavItem | null {
  // 当前菜单本身不满足访问条件时，直接隐藏整棵子树。
  if (!canShowItem(item, options)) {
    return null
  }

  // 链接菜单没有子级，满足访问条件即可展示。
  if (!item.items) {
    return item
  }

  const items = item.items
    .map((child) => filterNavItem(child, options))
    .filter((child): child is NavItem => child !== null)

  // 折叠菜单如果没有任何可进入页面，保留父级只会形成空菜单。
  if (!items.length) {
    return null
  }

  return {
    ...item,
    items,
  }
}

/**
 * 生成当前用户可见的侧栏数据，供侧栏和命令面板共用。
 */
export function getVisibleSidebarData(
  data: SidebarData,
  options: SidebarFilterOptions
): SidebarData {
  const normalizedOptions: Required<SidebarFilterOptions> = {
    debug: options.debug ?? false,
  }

  const navGroups = data.navGroups
    .map((group): NavGroup => {
      return {
        ...group,
        items: group.items
          .map((item) => filterNavItem(item, normalizedOptions))
          .filter((item): item is NavItem => item !== null),
      }
    })
    .filter((group) => group.items.length > 0)

  return {
    ...data,
    navGroups,
  }
}

/**
 * 拉平成可跳转菜单项，命令面板需要直接展示所有可达页面。
 */
export function flattenNavLinks(items: NavItem[], parents: string[] = []): NavLink[] {
  return items.flatMap((item) => {
    const nextParents = [...parents, item.title]

    // 叶子节点才对应真实路由，命令面板只收集可跳转页面。
    if (!item.items) {
      return [{ ...item, title: nextParents.join(' / ') }]
    }

    return flattenNavLinks(item.items, nextParents)
  })
}
