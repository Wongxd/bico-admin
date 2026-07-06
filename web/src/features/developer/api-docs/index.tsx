import { Main } from '@/components/layout/main'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const docOptions = [
  { label: 'Admin API', value: 'admin', path: '/swagger/admin/index.html' },
  { label: 'Open API', value: 'api', path: '/swagger/api/index.html' },
]

/**
 * 渲染后端 Swagger 文档入口，前端仅负责切换和嵌入现有页面。
 */
export function ApiDocs() {
  return (
    <>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>接口文档</h2>
        </div>

        <Card className='gap-0 overflow-hidden py-0'>
          <Tabs defaultValue='admin' className='h-[calc(100vh-12rem)] min-h-160 gap-0'>
            <div className='border-b px-4 py-3'>
              <TabsList>
                {docOptions.map((doc) => (
                  <TabsTrigger key={doc.value} value={doc.value}>
                    {doc.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <CardContent className='min-h-0 flex-1 p-0'>
              {docOptions.map((doc) => (
                <TabsContent key={doc.value} value={doc.value} className='m-0 h-full'>
                  <iframe
                    title={`${doc.label} 文档`}
                    src={doc.path}
                    className='h-full w-full border-0 bg-background'
                  />
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      </Main>
    </>
  )
}
