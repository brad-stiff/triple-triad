export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Button {
  id: string
  label: string
  rect: Rect
}

export function hitButton(buttons: Button[], x: number, y: number): string | null {
  for (const b of buttons) {
    const { x: bx, y: by, w, h } = b.rect
    if (x >= bx && x < bx + w && y >= by && y < by + h) return b.id
  }
  return null
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  button: Button,
  hovered: boolean
): void {
  const { x, y, w, h } = button.rect
  ctx.fillStyle = hovered ? '#4a6a9e' : '#2a3a5e'
  ctx.strokeStyle = '#c8b888'
  ctx.lineWidth = 2
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.fillStyle = '#f0e8d0'
  ctx.font = 'bold 18px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(button.label, x + w / 2, y + h / 2)
}

export function centerButtons(
  width: number,
  centerY: number,
  specs: { id: string; label: string }[]
): Button[] {
  const bw = 240
  const bh = 44
  const gap = 14
  const total = specs.length * bh + (specs.length - 1) * gap
  let y = centerY - total / 2
  return specs.map((s) => {
    const btn: Button = {
      id: s.id,
      label: s.label,
      rect: { x: width / 2 - bw / 2, y, w: bw, h: bh }
    }
    y += bh + gap
    return btn
  })
}

/** Stack buttons upward from the bottom edge of the screen */
export function stackButtonsFromBottom(
  width: number,
  height: number,
  bottomPadding: number,
  specs: { id: string; label: string }[],
  buttonWidth = 260,
  buttonHeight = 40,
  gap = 10
): Button[] {
  const total = specs.length * buttonHeight + (specs.length - 1) * gap
  let y = height - bottomPadding - total
  return specs.map((s) => {
    const btn: Button = {
      id: s.id,
      label: s.label,
      rect: { x: width / 2 - buttonWidth / 2, y, w: buttonWidth, h: buttonHeight }
    }
    y += buttonHeight + gap
    return btn
  })
}
