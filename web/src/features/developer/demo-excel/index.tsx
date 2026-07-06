import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  type RowSelectionState,
  useReactTable,
} from '@tanstack/react-table'
import {
  downloadDemoExcelTemplate,
  exportDemoExcel,
  importDemoExcel,
  type DemoExcelImportResult,
} from '@/services/demo-excel'
import { FileDown, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { downloadBlob, getFilenameFromContentDisposition } from '@/lib/download'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableToolbar,
} from '@/components/data-table'
import { Main } from '@/components/layout/main'

const templateHeaders = ['姓名', '手机号', '年龄', '城市']

type DemoExcelRow = {
  id: string
  name: string
  phone: string
  age: string
  city: string
}

const demoExcelRows: DemoExcelRow[] = [
  { id: '1', name: '王五', phone: '13600000000', age: '32', city: '深圳' },
  { id: '2', name: '赵六', phone: '13700000000', age: '25', city: '杭州' },
  { id: '3', name: '钱七', phone: '13500000000', age: '41', city: '成都' },
]

/**
 * 渲染 Excel 导入导出示例页面，导入预览使用公共 DataTable 展示。
 */
export function DemoExcel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] =
    useState<DemoExcelImportResult | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo<ColumnDef<DemoExcelRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='选择全部示例行'
            className='translate-y-0.5'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='选择当前示例行'
            className='translate-y-0.5'
          />
        ),
        size: 36,
        minSize: 36,
        maxSize: 36,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='姓名' />
        ),
        meta: { label: '姓名' },
        enableSorting: false,
      },
      {
        accessorKey: 'phone',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='手机号' />
        ),
        meta: { label: '手机号' },
        enableSorting: false,
      },
      {
        accessorKey: 'age',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='年龄' />
        ),
        meta: { label: '年龄' },
        enableSorting: false,
      },
      {
        accessorKey: 'city',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='城市' />
        ),
        meta: { label: '城市' },
        enableSorting: false,
      },
    ],
    []
  )

  const table = useReactTable({
    data: demoExcelRows,
    columns,
    state: { pagination, rowSelection },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

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
    // 未拖入文件时不触发导入，避免空请求。
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
        getFilenameFromContentDisposition(
          response.headers['content-disposition']
        ) || '导入模板_示例.xlsx'
      downloadBlob(response.data, filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载模板失败'
      toast.error(message)
    }
  }

  /**
   * 导出示例 Excel，导出期间禁用按钮防止重复请求。
   */
  async function handleExport(selectedIds: string[]) {
    setExporting(true)
    try {
      const response = await exportDemoExcel(selectedIds)
      const filename =
        getFilenameFromContentDisposition(
          response.headers['content-disposition']
        ) || '导出_示例.xlsx'
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
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>Excel 导入/导出</h2>
        <p className='mt-1 text-sm text-muted-foreground'>
          模板表头：{templateHeaders.join(' / ')}
        </p>
      </div>

      <Input
        ref={fileInputRef}
        type='file'
        accept='.xlsx,.xlsm,.xltx,.xltm,.csv'
        className='hidden'
        onChange={handleFileChange}
      />

      <div className='flex flex-1 flex-col gap-4'>
        <DataTableToolbar
          table={table}
          searchPlaceholder='筛选姓名...'
          searchKey='name'
          importAction={{
            onClick: () => setImportDialogOpen(true),
            isLoading: importing,
            disabled: importing,
          }}
          exportAction={{
            onClick: (selectedIds) => void handleExport(selectedIds),
            isLoading: exporting,
            disabled: exporting,
          }}
        />
        <DataTable table={table} emptyMessage='暂无示例数据' />
        {importResult && (
          <div className='flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
            <span>最近一次导入解析成功，共 {importResult.total} 行。</span>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setImportResult(null)}
            >
              清空
            </Button>
          </div>
        )}
      </div>

      {/* 导入 Dialog 弹窗，支持拖拽文件与模板下载。 */}
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
              'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
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

          <div className='mt-2 flex items-center justify-between'>
            <Button
              type='button'
              variant='link'
              onClick={() => void handleDownloadTemplate()}
              className='h-auto p-0 text-xs'
            >
              <FileDown className='mr-1 size-3.5' />
              下载导入模板
            </Button>
            {importing && (
              <span className='flex items-center text-xs text-muted-foreground'>
                <Loader2 className='mr-1 size-3 animate-spin' />
                正在解析，请稍候...
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
