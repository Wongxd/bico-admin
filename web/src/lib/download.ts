/**
 * 从 Content-Disposition 响应头中解析后端返回的文件名。
 */
export function getFilenameFromContentDisposition(value?: string | null) {
  if (!value) {
    return ''
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i)
  // filename*=UTF-8'' 优先级最高，能正确保留中文文件名。
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const filenameMatch = value.match(/filename="?([^"]+)"?/i)
  // 普通 filename 作为兼容路径，部分服务不会返回 RFC 5987 格式。
  if (filenameMatch?.[1]) {
    return filenameMatch[1]
  }

  return ''
}

/**
 * 使用临时链接触发浏览器下载，并在完成后释放 Blob URL。
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
