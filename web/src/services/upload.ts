import { api } from '@/lib/api'
import { buildApiUrl, type ApiResponse } from './auth'

export type UploadType = 'image' | 'video'

export interface EditorUploadResult {
  url: string
}

/**
 * 上传富文本编辑器媒体文件，并保留 type 字段让后端区分存储目录。
 */
export async function uploadForEditor(file: File, type: UploadType) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const response = await api.post<ApiResponse<EditorUploadResult>>(
    buildApiUrl('/upload'),
    formData
  )
  return response.data
}
