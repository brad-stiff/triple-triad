export interface Layout {
  width: number
  height: number
  cardSize: number
  centerX: number
  centerY: number
  boardRect: { x: number; y: number; w: number; h: number }
}

export function computeLayout(width: number, height: number): Layout {
  const topBar = 52
  const bottomBar = 36
  const playableH = height - topBar - bottomBar
  const cardSize = Math.floor(Math.min(width / 5.2, playableH / 3.8))
  const centerX = width / 2
  const centerY = topBar + playableH / 2
  const boardSpan = cardSize * 3
  const boardRect = {
    x: centerX - boardSpan / 2,
    y: centerY - boardSpan / 2,
    w: boardSpan,
    h: boardSpan
  }
  return { width, height, cardSize, centerX, centerY, boardRect }
}

export function boardCellRect(layout: Layout, index: number): { x: number; y: number } {
  const col = index % 3
  const row = Math.floor(index / 3)
  return {
    x: layout.boardRect.x + col * layout.cardSize,
    y: layout.boardRect.y + row * layout.cardSize
  }
}

/** Player 0 = blue (right), player 1 = red (left) — FF8 layout */
export function handCardCenter(
  layout: Layout,
  player: 0 | 1,
  handIndex: number,
  handSize: number,
  selected: boolean
): { x: number; y: number } {
  const visualIndex = handSize - 1 - handIndex
  const offset = layout.cardSize * (selected ? 1.95 : 2.1)
  const x = player === 0 ? layout.centerX + offset : layout.centerX - offset - layout.cardSize
  const y =
    layout.centerY - layout.cardSize + visualIndex * (layout.cardSize / 2)
  return { x: x + layout.cardSize / 2, y: y + layout.cardSize / 2 }
}

export function boardIndexAt(layout: Layout, x: number, y: number): number | null {
  const { boardRect, cardSize } = layout
  if (
    x < boardRect.x ||
    x >= boardRect.x + boardRect.w ||
    y < boardRect.y ||
    y >= boardRect.y + boardRect.h
  ) {
    return null
  }
  const col = Math.floor((x - boardRect.x) / cardSize)
  const row = Math.floor((y - boardRect.y) / cardSize)
  if (col < 0 || col > 2 || row < 0 || row > 2) return null
  return row * 3 + col
}

export function handIndexAt(
  layout: Layout,
  player: 0 | 1,
  handSize: number,
  x: number,
  y: number
): number | null {
  for (let i = 0; i < handSize; i++) {
    const c = handCardCenter(layout, player, i, handSize, false)
    const left = c.x - layout.cardSize / 2
    const top = c.y - layout.cardSize / 2
    if (x >= left && x < left + layout.cardSize && y >= top && y < top + layout.cardSize) {
      return i
    }
  }
  return null
}
