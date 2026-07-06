import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Download, FileDown, Loader2, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { downloadBlob, getFilenameFromContentDisposition } from '@/lib/download'
import {
  downloadDemoExcelTemplate,
  exportDemoExcel,
  importDemoExcel,
  type DemoExcelImportResult,
} from '@/services/demo-excel'

const templateHeaders = ['姓名', '手机号', '年龄', '城市']

/**
 * 渲染 Excel 导入导出示例页面，覆盖模板下载、导出、上传解析和预览。
 */
export function DemoExcel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<DemoExcelImportResult | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  /**
   * 拖放文件悬停时，高亮显示拖拽上传区域。
   */
  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  /**
   * 拖放文件移出时，取消高亮显示。
   */
  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
  }

  /**
   * 拖放文件松开时，触发上传解析。
   */
  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]
    if (file) {
      void handleImportFile(file)
    }
  }

  /**
   * 下载导入模板，文件名优先使用后端响应头。
   */
  async function handleDownloadTemplate() {
    try {
      const response = await downloadDemoExcelTemplate()
      const filename =
          getFilenameFromContentDisposition(response.headers['content-disposition']) ||
          '导入模板_示例.xlsx'
      downloadBlob(response.data, filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载模板失败'
      toast.error(message)
    }
  }

  /**
   * 导出示例 Excel，导出期间禁用按钮防止重复请求。
   */
  async function handleExport() {
    setExporting(true)
    try {
      const response = await exportDemoExcel()
      const filename =
          getFilenameFromContentDisposition(response.headers['content-disposition']) ||
          '导出_示例.xlsx'
      downloadBlob(response.data, filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出失败'
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }

  /**
   * 上传选择的文件并展示后端返回的前几行预览。
   */
  async function handleImportFile(file: File) {
    setImporting(true)
    try {
      const response = await importDemoExcel(file)
      // 只有业务 code 为 0 且 data 存在时才更新预览，避免展示旧结果。
      if (response.code !== 0 || !response.data) {
        throw new Error(response.msg || '导入失败')
      }

      setImportResult(response.data)
      toast.success(`导入解析成功，共 ${response.data.total} 行`)
      setImportDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入失败'
      toast.error(message)
    } finally {
      setImporting(false)
    }
  }

  /**
   * 处理原生文件选择，选择后立即上传并重置 input。
   */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    // 用户取消文件选择时不触发上传。
    if (!file) {
      return
    }

    void handleImportFile(file)
  }

  return (
    <>
      <Header fixed>
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Excel 导入/导出</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>文件操作</CardTitle>
            <CardDescription>模板表头：{templateHeaders.join(' / ')}</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap items-center gap-2'>
            <Input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,.xlsm,.xltx,.xltm,.csv'
              className='hidden'
              onChange={handleFileChange}
            />
            <Button
              type='button'
              variant='outline'
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload />
              导入
            </Button>
            <Button type='button' variant='outline' onClick={handleDownloadTemplate}>
              <FileDown />
              下载模板
            </Button>
            <Button type='button' disabled={exporting} onClick={handleExport}>
              <Download />
              {exporting ? '导出中' : '导出'}
            </Button>
          </CardContent>
        </Card>

        {/* 导入 Dialog 弹窗，支持拖拽文件与模板下载 */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>导入</DialogTitle>
              <DialogDescription>
                将 Excel 文件拖拽到虚线框内，或点击框体选择本地文件。
              </DialogDescription>
            </DialogHeader>

            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/10',
                importing && 'pointer-events-none opacity-50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className='mx-auto h-8 w-8 text-muted-foreground' />
              <p className='mt-2 text-sm text-muted-foreground'>
                将 Excel 文件拖拽到此处，或点击选择文件上传
              </p>
              <p className='mt-1 text-xs text-muted-foreground/70'>
                支持 .xlsx/.xlsm/.xltx/.xltm/.csv
              </p>
            </div>

            <div className='flex items-center justify-between mt-2'>
              <Button
                type='button'
                variant='link'
                onClick={handleDownloadTemplate}
                className='p-0 h-auto text-xs'
              >
                <FileDown className='size-3.5 mr-1' />
                下载导入模板
              </Button>
              {importing && (
                <span className='flex items-center text-xs text-muted-foreground'>
                  <Loader2 className='animate-spin size-3 mr-1 animate-duration-1000' />
                  正在解析，请稍候...
                </span>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {importResult && (
          <Card>
            <CardHeader className='items-start gap-3 sm:flex sm:flex-row sm:justify-between'>
              <div>
                <CardTitle>导入预览</CardTitle>
                <CardDescription>共 {importResult.total} 行，显示前 5 行。</CardDescription>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setImportResult(null)}
              >
                <X />
                清空
              </Button>
            </CardHeader>
            <CardContent>
              <pre className='max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-sm'>
                {JSON.stringify(importResult.preview, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}
