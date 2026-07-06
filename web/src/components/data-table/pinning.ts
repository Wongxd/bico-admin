import { type CSSProperties } from 'react'
import { type Column, type Row, type Table } from '@tanstack/react-table'

const SELECT_COLUMN_ID = 'select'
const ACTIONS_COLUMN_ID = 'actions'

/**
 * 规整列顺序，选择列固定在最前，操作列固定在最后，业务列在中间排序。
 */
function normalizeColumnOrder(columnIds: string[]) {
  const middleColumnIds = columnIds.filter(
    (id) => id !== SELECT_COLUMN_ID && id !== ACTIONS_COLUMN_ID
  )

  return [
    ...(columnIds.includes(SELECT_COLUMN_ID) ? [SELECT_COLUMN_ID] : []),
    ...middleColumnIds,
    ...(columnIds.includes(ACTIONS_COLUMN_ID) ? [ACTIONS_COLUMN_ID] : []),
  ]
}

/**
 * 移动表头列顺序，只调整业务列，避免选择列和操作列被移动到异常位置。
 */
export function moveColumnHeader<TData>(
  table: Table<TData>,
  columnId: string,
  direction: 'left' | 'right'
) {
  const currentOrder = table.getAllLeafColumns().map((column) => column.id)
  const nextOrder = [...currentOrder]
  const currentIndex = nextOrder.indexOf(columnId)

  // 找不到列时不处理，避免错误的列 id 破坏表头顺序。
  if (currentIndex < 0) {
    return
  }

  const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1
  const targetColumnId = nextOrder[targetIndex]

  // 业务列不能越过选择列和操作列，保证表格基础操作位置稳定。
  if (
    !targetColumnId ||
    targetColumnId === SELECT_COLUMN_ID ||
    targetColumnId === ACTIONS_COLUMN_ID
  ) {
    return
  }

  nextOrder[currentIndex] = targetColumnId
  nextOrder[targetIndex] = columnId
  table.setColumnOrder(normalizeColumnOrder(nextOrder))
}

/**
 * 固定或取消固定业务列，始终把选择列放在左固定区域第一列。
 */
export function toggleColumnLeftPinning<TData, TValue>(
  table: Table<TData>,
  column: Column<TData, TValue>
) {
  const isPinned = column.getIsPinned() === 'left'
  const selectColumnIds = table.getColumn(SELECT_COLUMN_ID)
    ? [SELECT_COLUMN_ID]
    : []

  table.setColumnPinning((old) => {
    const leftColumnIds = (old.left ?? []).filter(
      (id) => id !== SELECT_COLUMN_ID && id !== column.id
    )
    const rightColumnIds = (old.right ?? []).filter((id) => id !== column.id)

    // 取消固定时只移除当前列，选择列仍保持固定在最左侧。
    if (isPinned) {
      return {
        left: [...selectColumnIds, ...leftColumnIds],
        right: rightColumnIds,
      }
    }

    return {
      left: [...selectColumnIds, ...leftColumnIds, column.id],
      right: rightColumnIds,
    }
  })
}

/**
 * 按固定状态返回列样式，使用 TanStack 的偏移值避免多个固定列互相覆盖。
 */
export function getPinnedColumnStyle<TData, TValue>(
  column: Column<TData, TValue>
): CSSProperties {
  const pinned = column.getIsPinned()

  // 未固定列保持原始表格流，避免多余样式影响普通列宽。
  if (!pinned) {
    return {}
  }

  const style: CSSProperties = {
    position: 'sticky',
    width: column.getSize(),
    zIndex: 20,
  }

  // 左固定列需要按左侧已固定列宽累加偏移。
  if (pinned === 'left') {
    style.left = `${column.getStart('left')}px`
    return style
  }

  // 右固定列保留通用能力，后续若开放右固定不需要重写样式逻辑。
  style.right = `${column.getAfter('right')}px`
  return style
}

/**
 * 按固定方向返回边缘阴影，让固定列和可滚动区域有清晰分隔。
 */
export function getPinnedColumnClassName<TData, TValue>(
  column: Column<TData, TValue>
) {
  const pinned = column.getIsPinned()

  // 未固定列不添加阴影，避免普通列出现视觉噪音。
  if (!pinned) {
    return undefined
  }

  // 左固定列右侧加阴影，提示后面内容可横向滚动。
  if (pinned === 'left') {
    return 'shadow-[2px_0_4px_-2px_rgb(0_0_0_/_0.2)]'
  }

  // 右固定列左侧加阴影，保持和左固定列相反的视觉方向。
  return 'shadow-[-2px_0_4px_-2px_rgb(0_0_0_/_0.2)]'
}

/**
 * 按左固定、中间、右固定顺序返回可见单元格，确保固定列显示在正确位置。
 */
export function getVisibleCellsWithPinning<TData>(row: Row<TData>) {
  return [
    ...row.getLeftVisibleCells(),
    ...row.getCenterVisibleCells(),
    ...row.getRightVisibleCells(),
  ]
}
