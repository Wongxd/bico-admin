import axios, { type AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

type BizError = Error & {
  response?: AxiosResponse
  data?: unknown
}

/**
 * 封装 Axios 实例，提供拦截器和全局错误处理
 */
export const api = axios.create({
  baseURL: '',
  timeout: 10000,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().auth.accessToken
    // 如果存在 token，则注入到请求头的 Authorization 中
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    // 转发请求配置阶段的错误
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response

    // 检查后端返回的统一响应格式
    if (data && typeof data === 'object' && 'code' in data) {
      // 业务代码 code !== 0 表示存在业务逻辑错误
      if (data.code !== 0) {
        // code 为 401 说明用户未授权或登录过期，需要清理状态并跳转
        if (data.code === 401) {
          useAuthStore.getState().auth.reset()
          // 仅在非登录页面触发跳转，防止死循环
          if (window.location.pathname !== '/sign-in') {
            const redirect = encodeURIComponent(window.location.href)
            window.location.href = `/sign-in?redirect=${redirect}`
          }
        }
        
        // 组装业务错误并抛出
        const error: BizError = new Error(data.msg || '请求失败')
        error.name = 'BizError'
        error.response = response
        error.data = data
        return Promise.reject(error)
      }
    }

    return response
  },
  (error) => {
    // 处理 HTTP 状态码错误
    if (error.response) {
      const status = error.response.status
      // HTTP 401 状态码同样需要清理状态并跳转
      if (status === 401) {
        useAuthStore.getState().auth.reset()
        if (window.location.pathname !== '/sign-in') {
          const redirect = encodeURIComponent(window.location.href)
          window.location.href = `/sign-in?redirect=${redirect}`
        }
      }
    }
    return Promise.reject(error)
  }
)
