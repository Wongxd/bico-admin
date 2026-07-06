import { api } from '@/lib/api'
import { buildApiUrl, type ApiResponse } from './auth'

export interface Permission {
  key: string
  label: string
  children?: Permission[]
}

export interface AdminRole {
  id: number
  name: string
  code: string
  description: string
  enabled: boolean
  permissions?: string[]
  created_at?: string
  updated_at?: string
}

interface AdminRoleListParams {
  page?: number
  pageSize?: number
  name?: string
  code?: string
  enabled?: boolean
  sortField?: string
  sortOrder?: string
}

interface AdminRoleFormValues {
  name: string
  code?: string
  description: string
  enabled: boolean
  permissions?: string[]
}

interface AdminRolePageData {
  list: AdminRole[]
  total: number
}

interface RolePermissionsData {
  permissions: string[]
}

/**
 * 获取角色分页列表，并透传筛选与分页参数给后端标准 CRUD 接口。
 */
export async function getAdminRoles(params: AdminRoleListParams) {
  const response = await api.get<ApiResponse<AdminRolePageData>>(
    buildApiUrl('/admin-roles'),
    { params }
  )
  return response.data
}

/**
 * 获取全部启用角色，用于用户表单的角色选择。
 */
export async function getAllAdminRoles() {
  const response = await api.get<ApiResponse<AdminRole[]>>(
    buildApiUrl('/admin-roles/all')
  )
  return response.data
}

/**
 * 创建角色，创建时允许同时提交初始权限列表。
 */
export async function createAdminRole(data: AdminRoleFormValues) {
  const response = await api.post<ApiResponse<AdminRole>>(
    buildApiUrl('/admin-roles'),
    data
  )
  return response.data
}

/**
 * 更新角色基础信息，后端不允许修改角色代码，因此这里不发送 code。
 */
export async function updateAdminRole(
  id: number,
  data: Omit<AdminRoleFormValues, 'code' | 'permissions'>
) {
  const response = await api.put<ApiResponse<AdminRole>>(
    buildApiUrl(`/admin-roles/${id}`),
    data
  )
  return response.data
}

/**
 * 删除角色，后端会同步清理角色权限和用户角色关联。
 */
export async function deleteAdminRole(id: number) {
  const response = await api.delete<ApiResponse<null>>(
    buildApiUrl(`/admin-roles/${id}`)
  )
  return response.data
}

/**
 * 获取完整权限树，用于角色权限配置抽屉。
 */
export async function getAllPermissions() {
  const response = await api.get<ApiResponse<Permission[]>>(
    buildApiUrl('/admin-roles/permissions')
  )
  return response.data
}

/**
 * 获取指定角色的权限列表，用于列表数据不完整时补齐权限配置。
 */
export async function getRolePermissions(id: number) {
  const response = await api.get<ApiResponse<RolePermissionsData>>(
    buildApiUrl(`/admin-roles/${id}/permissions`)
  )
  return response.data
}

/**
 * 覆盖角色权限，必须显式传入 permissions，避免后端拒绝空字段。
 */
export async function updateRolePermissions(
  id: number,
  data: RolePermissionsData
) {
  const response = await api.put<ApiResponse<null>>(
    buildApiUrl(`/admin-roles/${id}/permissions`),
    data
  )
  return response.data
}
