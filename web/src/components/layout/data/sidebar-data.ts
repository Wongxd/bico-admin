import {
  BookOpen,
  FlaskConical,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  ToolCase,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navGroups: [
    {
      title: '菜单',
      items: [
        {
          title: '控制台',
          url: '/dashboard',
          icon: LayoutDashboard,
          access: 'dashboard:menu',
        },
        {
          title: '系统管理',
          icon: Settings,
          access: 'system:manage',
          items: [
            {
              title: '用户管理',
              url: '/system/admin-users',
              icon: Users,
              access: 'system:admin_user:menu',
            },
            {
              title: '角色管理',
              url: '/system/admin-roles',
              icon: ShieldCheck,
              access: 'system:admin_role:menu',
            },
          ],
        },
        {
          title: '开发者工具',
          icon: ToolCase,
          debugOnly: true,
          items: [
            {
              title: '接口文档',
              url: '/developer/api-docs',
              icon: BookOpen,
            },
            {
              title: '示例',
              icon: FlaskConical,
              items: [
                {
                  title: 'Excel 导入/导出',
                  url: '/developer/demo/excel',
                },
                {
                  title: '编辑器示例',
                  url: '/developer/demo/editor',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
