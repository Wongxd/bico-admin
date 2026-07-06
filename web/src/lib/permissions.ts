import { useAuthStore } from '@/stores/auth-store'

/**
 * 判断用户是否拥有指定权限；后端已为 admin 返回全量权限 key，因此这里不再额外兼容星号权限。
 */
export function hasPermission(permission: string) {
  const permissions = useAuthStore.getState().auth.user?.permissions
  return permissions?.includes(permission) ?? false
}

/**
 * 在组件内订阅指定权限，权限刷新后依赖该权限的按钮和入口会自动重渲染。
 */
export function useHasPermission(permission: string) {
  return useAuthStore((state) => {
    const permissions = state.auth.user?.permissions
    return permissions?.includes(permission) ?? false
  })
}

/**
 * 判断可选访问权限是否通过；没有声明权限的入口默认放行，只由其他业务条件控制。
 */
export function canAccessPermission(permission?: string) {
  // 没有声明权限时，说明该入口不是权限控制点。
  if (!permission) {
    return true
  }

  return hasPermission(permission)
}
