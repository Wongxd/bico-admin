import { ConfigDrawer } from '@/components/config-drawer'
import { ThemeSwitch } from '@/components/theme-switch'
import { Header } from './header'

type AppHeaderProps = {
  fixed?: boolean
  className?: string
}

/**
 * 渲染后台页面通用顶部栏，集中放置侧边栏开关、主题切换和布局配置入口。
 */
export function AppHeader({ fixed = true, className }: AppHeaderProps) {
  return (
    <Header fixed={fixed} className={className}>
      <ThemeSwitch />
      <ConfigDrawer />
    </Header>
  )
}
