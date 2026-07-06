import { api } from '@/lib/api'
import { buildApiUrl, type ApiResponse } from './auth'

export interface AppConfig {
  name: string
  logo: string
  debug: boolean
}

/**
 * 获取应用公共配置信息（名称、Logo及调试模式状态）
 */
export async function getAppConfig() {
  const response = await api.get<ApiResponse<AppConfig>>(
    buildApiUrl('/app-config')
  )
  return response.data
}
