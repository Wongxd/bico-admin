import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/**
 * 渲染 403 页面，提示当前账号缺少资源访问权限。
 */
export function ForbiddenError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>403</h1>
        <span className='font-medium'>无权访问</span>
        <p className='text-center text-muted-foreground'>
          当前账号没有足够权限 <br />
          查看这个资源。
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            返回上一页
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>返回首页</Button>
        </div>
      </div>
    </div>
  )
}
