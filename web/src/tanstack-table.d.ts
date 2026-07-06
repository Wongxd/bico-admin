import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string // 显示列菜单使用的列名，避免把后端字段名暴露给用户。
    className?: string // apply to both th and td
    tdClassName?: string
    thClassName?: string
  }
}
