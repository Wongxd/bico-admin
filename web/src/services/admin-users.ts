import { api } from '@/lib/api'
import { buildApiUrl, type ApiResponse } from './auth'

export interface AdminUserRole {
  id: number
  name: string
  code?: string
}

export interface AdminUser {
  id: number
  username: string
  name: string
  avatar: string
  enabled: boolean
  is_super_admin?: boolean
  roles?: AdminUserRole[]
  created_at?: string
  updated_at?: string
}

interface AdminUserListParams {
  page?: number
  pageSize?: number
  username?: string
  name?: string
  enabled?: boolean
  role_ids?: string
  sortField?: string
  sortOrder?: string
}

interface AdminUserPageData {
  list: AdminUser[]
  total: number
}

interface CreateAdminUserParams {
  username: string
  password: string
  name: string
  avatar: string
  enabled: boolean
  role_ids: number[]
}

interface UpdateAdminUserParams {
  username: string
  name: string
  avatar: string
  enabled: boolean
  role_ids: number[]
  password?: string
}

/**
 * 获取后台用户分页列表，并透传筛选与分页参数给后端标准 CRUD 接口。
 */
export async function getAdminUsers(params: AdminUserListParams) {
  const response = await api.get<ApiResponse<AdminUserPageData>>(
    buildApiUrl('/admin-users'),
    { params }
  )
  return response.data
}

/**
 * 创建后台用户，角色字段按后端要求发送为 role_ids。
 */
export async function createAdminUser(data: CreateAdminUserParams) {
  const response = await api.post<ApiResponse<AdminUser>>(
    buildApiUrl('/admin-users'),
    data
  )
  return response.data
}

/**
 * 更新后台用户基础资料、角色和可选新密码。
 */
export async function updateAdminUser(id: number, data: UpdateAdminUserParams) {
  const response = await api.put<ApiResponse<AdminUser>>(
    buildApiUrl(`/admin-users/${id}`),
    data
  )
  return response.data
}

/**
 * 删除后台用户，后端会同步清理用户角色关联。
 */
export async function deleteAdminUser(id: number) {
  const response = await api.delete<ApiResponse<null>>(
    buildApiUrl(`/admin-users/${id}`)
  )
  return response.data
}

/**
 * 批量删除后台用户，DELETE 请求体必须放在 axios 的 data 字段中。
 */
export async function deleteAdminUsers(ids: number[]) {
  const response = await api.delete<ApiResponse<null>>(
    buildApiUrl('/admin-users/batch'),
    { data: { ids } }
  )
  return response.data
}
