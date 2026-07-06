import { useState } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { RichEditor } from '@/components/rich-editor'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * 渲染富文本编辑器示例页面，同步展示当前 HTML 输出。
 */
export function EditorDemo() {
  const [html, setHtml] = useState('<p>这是一个示例内容</p>')

  return (
    <>
      <Header fixed>
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>编辑器示例</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>富文本编辑器</CardTitle>
            <CardDescription>支持图片、视频和常用文本格式。</CardDescription>
          </CardHeader>
          <CardContent>
            <RichEditor value={html} onChange={setHtml} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前 HTML</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-sm'>
              {html}
            </pre>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
