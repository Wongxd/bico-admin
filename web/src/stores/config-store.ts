import { create } from 'zustand'
import { getAppConfig, type AppConfig } from '@/services/common'

interface ConfigState {
  config: {
    appConfig: AppConfig | null
    setAppConfig: (appConfig: AppConfig | null) => void
    fetchAppConfig: () => Promise<AppConfig | null>
  }
}

/**
 * 应用配置状态管理 Store，主要用来在首屏或初始化时获取并全局共享 Logo、应用名称等配置。
 */
export const useConfigStore = create<ConfigState>()((set) => {
  return {
    config: {
      appConfig: null,
      /**
       * 手动更新应用配置状态。
       */
      setAppConfig: (appConfig) =>
        set((state) => ({ ...state, config: { ...state.config, appConfig } })),
      /**
       * 异步获取后端应用配置，并更新到状态中。
       */
      fetchAppConfig: async () => {
        try {
          const response = await getAppConfig()
          // code === 0 说明请求成功且数据有效
          if (response.code === 0 && response.data) {
            set((state) => ({
              ...state,
              config: { ...state.config, appConfig: response.data },
            }))

            // 如果后端配置了 Logo，则动态更换浏览器的 Favicon 图标
            if (response.data.logo) {
              // 移除页面中所有已有的 icon 链接，防止被旧的或不同主题的 icon 覆盖
              const existingLinks = document.querySelectorAll("link[rel~='icon']")
              existingLinks.forEach((el) => el.remove())

              // 创建一个全新的 icon 链接并指向当前 Logo
              const link = document.createElement('link')
              link.rel = 'icon'
              link.href = response.data.logo
              document.head.appendChild(link)
            }

            // 如果后端配置了应用名称，则更新浏览器标签页的默认标题
            if (response.data.name) {
              document.title = response.data.name
            }

            return response.data
          }
          return null
        } catch {
          return null
        }
      },
    },
  }
})
