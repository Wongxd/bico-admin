import { api } from '@/lib/api'

// API 统一前缀
const API_PREFIX = '/admin-api'

/**
 * 组装完整的 API 请求路径
 */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_PREFIX}${normalizedPath}`
}

interface LoginParams {
  username?: string
  password?: string
  captchaId?: string
  captchaCode?: string
  rememberPassword?: boolean
}

interface LoginResult {
  token: string
}

export interface CurrentUser {
  id: number
  username: string
  name: string
  avatar: string
  enabled?: boolean
  roles?: string[]
  permissions?: string[]
}

interface UpdateProfileParams {
  name: string
  avatar: string
}

interface UploadAvatarResult {
  url: string
}

interface ChangePasswordParams {
  oldPassword: string
  newPassword: string
}

interface CaptchaResult {
  id: string
  image: string
}

export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

/**
 * 调用后端登录接口
 */
export async function login(data: LoginParams) {
  const response = await api.post<ApiResponse<LoginResult>>(
    buildApiUrl('/auth/login'),
    data
  )
  return response.data
}

/**
 * 调用后端退出登录接口
 */
export async function logout() {
  const response = await api.post<ApiResponse<null>>(
    buildApiUrl('/auth/logout')
  )
  return response.data
}

/**
 * 获取当前登录用户的信息
 */
export async function getCurrentUser() {
  const response = await api.get<ApiResponse<CurrentUser>>(
    buildApiUrl('/auth/current-user')
  )
  return response.data
}

/**
 * 更新当前登录用户的个人资料
 */
export async function updateProfile(data: UpdateProfileParams) {
  const response = await api.put<ApiResponse<CurrentUser>>(
    buildApiUrl('/auth/profile'),
    data
  )
  return response.data
}

/**
 * 上传当前登录用户的头像文件
 */
export async function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await api.post<ApiResponse<UploadAvatarResult>>(
    buildApiUrl('/auth/avatar'),
    formData
  )
  return response.data
}

/**
 * 修改当前登录用户的密码
 */
export async function changePassword(data: ChangePasswordParams) {
  const response = await api.put<ApiResponse<null>>(
    buildApiUrl('/auth/password'),
    data
  )
  return response.data
}

/**
 * 获取图形验证码
 */
export async function getCaptcha() {
  const response = await api.get<ApiResponse<CaptchaResult>>(
    buildApiUrl('/captcha')
  )
  return response.data
}
