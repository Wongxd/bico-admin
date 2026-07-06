import { api } from '@/lib/api'
import { buildApiUrl, type ApiResponse } from './auth'

export interface DemoExcelImportResult {
  total: number
  preview: string[][]
}

/**
 * 请求后端生成 Excel 导入模板，返回 Blob 及响应头用于还原文件名。
 */
export async function downloadDemoExcelTemplate() {
  return api.get<Blob>(buildApiUrl('/demo/excel/template'), {
    responseType: 'blob',
  })
}

/**
 * 请求后端导出示例 Excel 文件，返回 Blob 及响应头用于浏览器下载。
 */
export async function exportDemoExcel(ids?: string[]) {
  return api.get<Blob>(buildApiUrl('/demo/excel/export'), {
    params: ids?.length ? { ids: ids.join(',') } : undefined,
    responseType: 'blob',
  })
}

/**
 * 上传 Excel 或 CSV 文件并读取后端解析出的预览结果。
 */
export async function importDemoExcel(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<ApiResponse<DemoExcelImportResult>>(
    buildApiUrl('/demo/excel/import'),
    formData
  )
  return response.data
}
