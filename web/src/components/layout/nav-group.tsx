import { useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'
import { flattenNavLinks } from './data/sidebar-utils'

export function NavGroup({ items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })
  const activeKey = findActiveCollapsibleKey(items, href)
  const [accordionState, setAccordionState] = useState({
    href,
    openKeys: activeKey ? [activeKey] : [],
  })
  const openKeys =
    accordionState.href === href
      ? accordionState.openKeys
      : activeKey
        ? [activeKey]
        : []

  /**
   * 菜单项选中后才触发手风琴收拢，确保选中路径之外的同级菜单被关闭。
   */
  function handleItemSelect(nextHref: string) {
    const nextActiveKey = findActiveCollapsibleKey(items, nextHref)
    setAccordionState({
      href,
      openKeys: nextActiveKey ? [nextActiveKey] : [],
    })
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const key = getNavItemKey(item)

          if (!item.items)
            return (
              <SidebarMenuLink
                key={key}
                item={item}
                href={href}
                onItemSelect={handleItemSelect}
              />
            )

          if (state === 'collapsed' && !isMobile)
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
            )

          return (
            <SidebarMenuCollapsible
              key={key}
              item={item}
              href={href}
              open={openKeys.includes(key)}
              onOpenChange={(open) => {
                setAccordionState({
                  href,
                  openKeys: toggleOpenKey(openKeys, key, open),
                })
              }}
              onItemSelect={handleItemSelect}
            />
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

/**
 * 渲染折叠菜单的子级内容，递归支持多层菜单结构。
 */
function SidebarMenuSubContent({
  items,
  href,
  onItemSelect,
}: {
  items: NavItem[]
  href: string
  onItemSelect: (href: string) => void
}) {
  const activeKey = findActiveCollapsibleKey(items, href)
  const [accordionState, setAccordionState] = useState({
    href,
    openKeys: activeKey ? [activeKey] : [],
  })
  const openKeys =
    accordionState.href === href
      ? accordionState.openKeys
      : activeKey
        ? [activeKey]
        : []

  /**
   * 子级菜单选中后，当前层和上层一起按选中路径执行手风琴收拢。
   */
  function handleItemSelect(nextHref: string) {
    const nextActiveKey = findActiveCollapsibleKey(items, nextHref)
    setAccordionState({
      href,
      openKeys: nextActiveKey ? [nextActiveKey] : [],
    })
    onItemSelect(nextHref)
  }

  return (
    <SidebarMenuSub>
      {items.map((subItem) => {
        const key = getNavItemKey(subItem)

        return (
          <SidebarMenuSubNode
            key={key}
            item={subItem}
            href={href}
            open={openKeys.includes(key)}
            onOpenChange={(open) => {
              setAccordionState({
                href,
                openKeys: toggleOpenKey(openKeys, key, open),
              })
            }}
            onItemSelect={handleItemSelect}
          />
        )
      })}
    </SidebarMenuSub>
  )
}

/**
 * 渲染单个子菜单节点，叶子节点跳转，父节点继续展开。
 */
function SidebarMenuSubNode({
  item,
  href,
  open,
  onOpenChange,
  onItemSelect,
}: {
  item: NavItem
  href: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemSelect: (href: string) => void
}) {
  const { setOpenMobile } = useSidebar()

  // 没有 items 的节点是实际路由入口，点击后关闭移动端侧栏。
  if (!item.items) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={checkIsActive(href, item)}>
          <Link
            to={item.url}
            onClick={() => {
              onItemSelect(navUrlToString(item.url))
              setOpenMobile(false)
            }}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={onOpenChange}
      className='group/sub-collapsible'
    >
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton isActive={checkIsActive(href, item)}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSubContent
            items={item.items}
            href={href}
            onItemSelect={onItemSelect}
          />
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function SidebarMenuLink({
  item,
  href,
  onItemSelect,
}: {
  item: NavLink
  href: string
  onItemSelect: (href: string) => void
}) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
      >
        <Link
          to={item.url}
          onClick={() => {
            onItemSelect(navUrlToString(item.url))
            setOpenMobile(false)
          }}
        >
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
  open,
  onOpenChange,
  onItemSelect,
}: {
  item: NavCollapsible
  href: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemSelect: (href: string) => void
}) {
  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={onOpenChange}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSubContent
            items={item.items}
            href={href}
            onItemSelect={onItemSelect}
          />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(href, item)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {flattenNavLinks(item.items).map((sub) => (
            <DropdownMenuItem key={getNavItemKey(sub)} asChild>
              <Link
                to={sub.url}
                className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
              >
                {sub.icon && <sub.icon />}
                <span className='max-w-52 text-wrap'>{sub.title}</span>
                {sub.badge && (
                  <span className='ms-auto text-xs'>{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

/**
 * 父级菜单点击只切换自身展开状态，不触发同层互斥；同层互斥只在叶子菜单选中后执行。
 */
function toggleOpenKey(openKeys: string[], key: string, open: boolean) {
  // 展开父级菜单时保留其它已展开项，避免用户浏览菜单结构时被动收起上下文。
  if (open) {
    return openKeys.includes(key) ? openKeys : [...openKeys, key]
  }

  // 收起父级菜单时只移除当前项，选中菜单切换时的互斥由 handleItemSelect 单独负责。
  return openKeys.filter((openKey) => openKey !== key)
}

/**
 * 菜单 URL 统一转成字符串，用于计算选中后要保留的展开分支。
 */
function navUrlToString(url: NavLink['url']) {
  return String(url)
}

/**
 * 找到当前层级中命中路由的折叠菜单 key，用于手风琴自动展开当前分支。
 */
function findActiveCollapsibleKey(items: NavItem[], href: string): string | null {
  const activeItem = items.find((item) => {
    // 只有带子菜单的节点需要参与手风琴展开状态。
    if (!item.items) {
      return false
    }

    return checkIsActive(href, item, true)
  })

  // 没有命中父菜单时允许当前层级全部收起。
  if (!activeItem) {
    return null
  }

  return getNavItemKey(activeItem)
}

/**
 * 为菜单节点生成稳定 key，避免多层菜单下标题重复造成渲染冲突。
 */
function getNavItemKey(item: NavItem): string {
  // 叶子节点使用 URL 更稳定，父级菜单没有 URL 时使用标题。
  if (!item.items) {
    return `${item.title}-${item.url}`
  }

  return `${item.title}-${item.items.map(getNavItemKey).join('|')}`
}

/**
 * 判断当前地址是否命中菜单项，父菜单递归检查所有子页面。
 */
function checkIsActive(href: string, item: NavItem, mainNav = false): boolean {
  const pathname = href.split('?')[0]

  // 父级菜单自身没有 URL，需要递归检查子节点是否命中。
  if (item.items) {
    return item.items.some((child) => checkIsActive(href, child, mainNav))
  }

  const url = item.url
  // 类型收窄无法覆盖递归联合类型，缺少 URL 时不能作为叶子节点命中。
  if (!url) {
    return false
  }

  return (
    href === url || // /endpint?search=param
    pathname === url || // endpoint
    (mainNav &&
      pathname.split('/')[1] !== '' &&
      pathname.split('/')[1] === url.split('/')[1])
  )
}
