import { type ReactNode } from 'react'

type RequiredLabelProps = {
  children: ReactNode
}

/**
 * 渲染表单必填标识，只用于当前校验规则明确要求填写的字段。
 */
export function RequiredLabel({ children }: RequiredLabelProps) {
  return (
    <span className='inline-flex items-center gap-1'>
      {children}
      <span className='text-destructive' aria-hidden='true'>
        *
      </span>
    </span>
  )
}
