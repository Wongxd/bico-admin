# 前端 CRUD 开发指南

前端基于 **Vite + React 19 + TanStack Router + TanStack Query + TanStack Table + Tailwind CSS + shadcn/ui**。

参考实现：
- 用户管理：`web/src/features/admin-users`
- 角色管理：`web/src/features/admin-roles`

## 文件变更范围

标准后端 CRUD 对接通常需要 **5 个手工文件**：

| 文件 | 职责 |
|------|------|
| `web/src/services/<module>.ts` | 定义类型、分页查询、新增、编辑、删除接口 |
| `web/src/features/<module>/index.tsx` | 页面主体、表格列、筛选、分页、删除、权限按钮 |
| `web/src/features/<module>/components/<module>-action-drawer.tsx` | 新增/编辑抽屉、表单校验、提交逻辑 |
| `web/src/routes/_authenticated/<group>/<module>.tsx` | 路由、搜索参数 schema、菜单权限拦截 |
| `web/src/components/layout/data/sidebar-data.ts` | 侧边栏菜单入口、图标、菜单权限 |

可选文件：

| 场景 | 额外文件 |
|------|----------|
| 权限配置、导入导出、分配关系等额外动作 | `features/<module>/components/<module>-xxx-drawer.tsx` |
| 复杂树、字段转换、选择状态补齐 | `features/<module>/data/*.ts` |
| 新增一级菜单分组 | `routes/_authenticated/<group>/index.tsx` |
| TanStack Router 生成结果 | `web/src/routeTree.gen.ts`，自动生成，不手工维护 |

结论：
- 简单 CRUD：5 个文件
- 带额外动作：6-7 个文件
- 新菜单分组或复杂业务：8 个以上文件

## 接入步骤

### 1. 创建服务文件

在 `web/src/services/<module>.ts` 中定义接口类型和请求函数。

```ts
import { api } from '@/lib/api'
import { buildApiUrl, type ApiResponse } from './auth'

export interface Article {
  id: number
  title: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface ArticleListParams {
  page?: number
  pageSize?: number
  title?: string
  enabled?: boolean
  sortField?: string
  sortOrder?: string
}

export interface ArticlePageData {
  list: Article[]
  total: number
}

export interface ArticleFormValues {
  title: string
  enabled: boolean
}

/**
 * 获取文章分页列表，并透传筛选、分页和排序参数给后端标准 CRUD 接口。
 */
export async function getArticles(params: ArticleListParams) {
  const response = await api.get<ApiResponse<ArticlePageData>>(
    buildApiUrl('/articles'),
    { params }
  )
  return response.data
}

/**
 * 创建文章记录，字段结构必须和后端 create request 保持一致。
 */
export async function createArticle(data: ArticleFormValues) {
  const response = await api.post<ApiResponse<Article>>(
    buildApiUrl('/articles'),
    data
  )
  return response.data
}

/**
 * 更新文章记录，只提交后端允许编辑的字段。
 */
export async function updateArticle(id: number, data: ArticleFormValues) {
  const response = await api.put<ApiResponse<Article>>(
    buildApiUrl(`/articles/${id}`),
    data
  )
  return response.data
}

/**
 * 删除文章记录，删除前的确认交给页面层处理。
 */
export async function deleteArticle(id: number) {
  const response = await api.delete<ApiResponse<null>>(
    buildApiUrl(`/articles/${id}`)
  )
  return response.data
}
```

### 2. 创建路由文件

在 `web/src/routes/_authenticated/<group>/<module>.tsx` 中接入页面和权限。

```tsx
import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Articles } from '@/features/articles'
import { useAuthStore } from '@/stores/auth-store'

const articlesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  title: z.string().optional().catch(''),
  enabled: z.array(z.enum(['true', 'false'])).optional().catch([]),
})

export const Route = createFileRoute('/_authenticated/content/articles')({
  beforeLoad: () => {
    const user = useAuthStore.getState().auth.user
    if (
      !user?.permissions?.includes('*') &&
      !user?.permissions?.includes('content:article:menu')
    ) {
      throw redirect({ to: '/403' })
    }
  },
  validateSearch: articlesSearchSchema,
  component: Articles,
})
```

### 3. 添加侧边栏菜单

在 `web/src/components/layout/data/sidebar-data.ts` 添加菜单项。

```ts
{
  title: '文章管理',
  url: '/content/articles',
  icon: FileText,
  access: 'content:article:menu',
}
```

菜单权限必须和后端返回的 `menu` 权限一致。父级菜单如果声明 `access`，也必须保证角色拥有父级权限，否则子菜单会被整体隐藏。

### 4. 创建页面主体

在 `web/src/features/<module>/index.tsx` 中处理列表查询、表格状态、权限按钮和删除。

页面主体应包含：
- `getRouteApi('/_authenticated/<group>/<module>')`
- `useTableUrlState` 同步 URL 查询参数
- `useQuery` 获取分页数据
- `useMutation` 删除记录
- `useMemo<ColumnDef<T>[]>` 定义表格列
- `DataTable`、`DataTableToolbar`、`ConfirmDialog`
- 新增/编辑抽屉组件

权限命名沿用后端 CRUD 权限：

| 操作 | 权限 |
|------|------|
| 菜单 | `<prefix>:menu` |
| 列表 | `<prefix>:list` |
| 新增 | `<prefix>:add` |
| 编辑 | `<prefix>:edit` |
| 删除 | `<prefix>:delete` |

当前页面按钮只在前端隐藏，不替代后端权限校验。

### 5. 创建新增/编辑抽屉

在 `web/src/features/<module>/components/<module>-action-drawer.tsx` 中处理表单。

抽屉组件应包含：
- `zod` 表单 schema
- `react-hook-form`
- `zodResolver`
- `useMutation`
- 成功后 `invalidateQueries`
- `Sheet`、`Form`、`Input`、`Switch` 等 shadcn/ui 组件

新增和编辑共用一个抽屉。编辑模式下不要提交后端不允许修改的字段。

## 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 服务文件 | 短横线 | `admin-users.ts` |
| 页面目录 | 短横线 | `features/admin-users` |
| 路由文件 | 短横线 | `system/admin-users.tsx` |
| 主组件 | 大驼峰复数 | `AdminUsers` |
| 抽屉组件 | `<Module>ActionDrawer` | `AdminUsersActionDrawer` |
| queryKey | 短横线复数 | `['admin-users']` |
| 权限前缀 | 模块冒号格式 | `system:admin_user` |

## 开发检查

新增 CRUD 后至少运行：

```bash
cd web
pnpm exec eslint "src/features/<module>" "src/routes/_authenticated/<group>/<module>.tsx" "src/services/<module>.ts"
pnpm build
```

如果 `pnpm build` 触发 `routeTree.gen.ts` 更新，保留自动生成结果。

## 常见问题

### 为什么不是一个文件完成？

当前前端将职责拆开：服务层负责请求，路由层负责 URL 和权限入口，页面层负责表格交互，抽屉负责表单。

### 什么时候需要拆更多组件？

只有在表单很复杂、存在额外动作、或页面文件明显超过可读范围时才拆。不要为了“未来可能复用”提前抽象。

### 侧边栏看不到菜单怎么办？

先检查三处：
1. 当前用户是否拥有 `<prefix>:menu`
2. 父级菜单是否也声明了 `access`
3. 后端 `/auth/current-user` 是否返回了对应权限

### 查询参数为什么要写在路由里？

路由 schema 负责把 URL 查询参数收窄成页面可用类型。表格筛选、分页和刷新恢复都依赖它。
