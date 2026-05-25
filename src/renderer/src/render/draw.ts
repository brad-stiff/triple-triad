import { flipHighlightAlpha, placeAnimPosition, type MatchAnim } from '../game/animations'
import { elementLabel } from '../game/elemental'
import { RANK_LABELS } from '../game/constants'
import type { CardDefinition, MatchState, PlacedCard, PlayerId } from '../game/types'
import { getBoardImage, getCardImage, getFrameImage, hasCardArt } from './assets'
import { boardCellRect, handCardCenter, type Layout } from './layout'

export interface DrawMatchOptions {
  hideBoardIndices?: number[]
  floatingPlace?: MatchAnim & { kind: 'place' }
}

const PLAYER_COLORS: Record<PlayerId, string> = {
  0: '#2a4a9e',
  1: '#9e2a2a'
}

const ELEMENT_COLORS: Record<string, string> = {
  NEUTRAL: '#888',
  FIRE: '#c44',
  ICE: '#6cf',
  THUNDER: '#cc4',
  EARTH: '#a74',
  POISON: '#a4a',
  WIND: '#8cf',
  WATER: '#48c',
  HOLY: '#ff8'
}

function drawRank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  size: number
): void {
  const label = RANK_LABELS[value] ?? String(value)
  ctx.fillStyle = '#f4e8c8'
  ctx.strokeStyle = '#1a1208'
  ctx.lineWidth = 2
  ctx.font = `bold ${Math.floor(size * 0.22)}px Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeText(label, x, y)
  ctx.fillText(label, x, y)
}

function drawCardBack(
  ctx: CanvasRenderingContext2D,
  owner: PlayerId,
  cx: number,
  cy: number,
  size: number,
  highlight: boolean
): void {
  const half = size / 2
  const x = cx - half
  const y = cy - half
  ctx.fillStyle = owner === 0 ? '#1a2848' : '#481a1a'
  ctx.fillRect(x, y, size, size)
  ctx.strokeStyle = highlight ? '#fff8c0' : '#666'
  ctx.lineWidth = highlight ? 4 : 2
  ctx.strokeRect(x + 2, y + 2, size - 4, size - 4)
  ctx.fillStyle = '#888'
  ctx.font = `bold ${Math.floor(size * 0.12)}px Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('?', cx, cy)
}

function drawCardFace(
  ctx: CanvasRenderingContext2D,
  def: CardDefinition,
  owner: PlayerId,
  cx: number,
  cy: number,
  size: number,
  highlight: boolean
): void {
  const half = size / 2
  const x = cx - half
  const y = cy - half

  const frame = getFrameImage(owner)
  if (frame) {
    ctx.drawImage(frame, x, y, size, size)
  } else {
    ctx.fillStyle = PLAYER_COLORS[owner]
    ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = highlight ? '#fff8c0' : '#222'
    ctx.lineWidth = highlight ? 4 : 2
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
  }

  const art = getCardImage(def.id)
  if (art && hasCardArt(def.id)) {
    const pad = size * 0.08
    ctx.drawImage(art, x + pad, y + pad, size - pad * 2, size - pad * 2)
  } else {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(x + size * 0.1, y + size * 0.12, size * 0.8, size * 0.55)
    ctx.fillStyle = '#e8e0d0'
    ctx.font = `${Math.floor(size * 0.09)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(def.name, cx, cy - size * 0.05, size * 0.85)
  }

  const pad = size * 0.06
  drawRank(ctx, cx, y + pad + size * 0.08, def.ranks[0], size)
  drawRank(ctx, x + pad + size * 0.08, cy, def.ranks[1], size)
  drawRank(ctx, x + size - pad - size * 0.08, cy, def.ranks[2], size)
  drawRank(ctx, cx, y + size - pad - size * 0.08, def.ranks[3], size)

  if (def.element !== 'NEUTRAL') {
    ctx.fillStyle = ELEMENT_COLORS[def.element] ?? '#fff'
    ctx.beginPath()
    ctx.arc(x + size - pad * 2, y + pad * 2, size * 0.05, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: MatchState,
  options: DrawMatchOptions = {}
): void {
  const hide = new Set(options.hideBoardIndices ?? [])
  const boardImg = getBoardImage()
  if (boardImg) {
    ctx.drawImage(
      boardImg,
      layout.boardRect.x,
      layout.boardRect.y,
      layout.boardRect.w,
      layout.boardRect.h
    )
  } else {
    ctx.fillStyle = '#1e3a2f'
    ctx.fillRect(
      layout.boardRect.x,
      layout.boardRect.y,
      layout.boardRect.w,
      layout.boardRect.h
    )
    ctx.strokeStyle = '#4a7a5a'
    ctx.lineWidth = 2
    for (let i = 0; i < 9; i++) {
      const { x, y } = boardCellRect(layout, i)
      ctx.strokeRect(x, y, layout.cardSize, layout.cardSize)
    }
  }

  for (let i = 0; i < 9; i++) {
    const el = state.elements[i]
    if (el !== 'NEUTRAL') {
      const { x, y } = boardCellRect(layout, i)
      const pad = 4
      ctx.fillStyle = (ELEMENT_COLORS[el] ?? '#888') + '44'
      ctx.fillRect(x + pad, y + pad, layout.cardSize - pad * 2, layout.cardSize - pad * 2)
      ctx.fillStyle = ELEMENT_COLORS[el] ?? '#fff'
      ctx.font = `bold ${Math.floor(layout.cardSize * 0.1)}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(elementLabel(el), x + layout.cardSize / 2, y + 6)
    }
  }

  for (let i = 0; i < 9; i++) {
    if (hide.has(i)) continue
    const cell = state.board[i]
    if (!cell) continue
    const { x, y } = boardCellRect(layout, i)
    drawCardFace(
      ctx,
      cell.def,
      cell.owner,
      x + layout.cardSize / 2,
      y + layout.cardSize / 2,
      layout.cardSize,
      state.selectedBoardIndex === i
    )
  }

  if (
    state.selectedBoardIndex !== null &&
    !state.board[state.selectedBoardIndex] &&
    !hide.has(state.selectedBoardIndex)
  ) {
    const { x, y } = boardCellRect(layout, state.selectedBoardIndex)
    ctx.strokeStyle = 'rgba(255, 248, 180, 0.85)'
    ctx.lineWidth = 3
    ctx.strokeRect(x + 2, y + 2, layout.cardSize - 4, layout.cardSize - 4)
  }
}

export function drawFlipOverlay(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  anim: MatchAnim & { kind: 'flip' }
): void {
  const alpha = flipHighlightAlpha(anim)
  if (alpha <= 0) return
  for (const i of anim.boardIndices) {
    const { x, y } = boardCellRect(layout, i)
    ctx.fillStyle = `rgba(255, 240, 160, ${alpha * 0.55})`
    ctx.fillRect(x, y, layout.cardSize, layout.cardSize)
  }
}

export function drawFloatingCard(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  anim: MatchAnim & { kind: 'place' }
): void {
  const { x, y } = placeAnimPosition(anim)
  drawCardFace(ctx, anim.card, anim.owner, x, y, layout.cardSize, false)
}

export function drawHands(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: MatchState,
  playerNames: [string, string]
): void {
  const open = state.rules.open
  const humanPlayer = state.cpuPlayer === null ? null : state.cpuPlayer === 0 ? 1 : 0

  for (const player of [0, 1] as const) {
    const hand = state.hands[player]
    const isActive = state.turn === player
    const showFaces =
      open ||
      (humanPlayer !== null ? player === humanPlayer : player === state.turn)
    hand.forEach((card, index) => {
      const selected = isActive && state.selectedHandIndex === index
      const { x, y } = handCardCenter(layout, player, index, hand.length, selected)
      if (showFaces) {
        drawCardFace(ctx, card, player, x, y, layout.cardSize, selected)
      } else {
        drawCardBack(ctx, player, x, y, layout.cardSize, selected)
      }
    })
  }

  ctx.font = 'bold 18px Georgia, serif'
  ctx.fillStyle = '#c8d8f0'
  ctx.textAlign = 'center'
  ctx.fillText(playerNames[1], layout.centerX - layout.cardSize * 2.2, 28)
  ctx.fillText(playerNames[0], layout.centerX + layout.cardSize * 2.2, 28)

  ctx.font = '16px Georgia, serif'
  ctx.fillStyle = '#f0e8c8'
  if (state.lastResolutionMessage) {
    ctx.fillStyle = '#ffe8a0'
    ctx.font = 'bold 18px Georgia, serif'
    ctx.fillText(state.lastResolutionMessage, layout.centerX, layout.height - 24)
    ctx.font = '14px Georgia, serif'
    ctx.fillStyle = '#c8d0e0'
    ctx.fillText(`${playerNames[state.turn]}'s turn`, layout.centerX, layout.height - 8)
  } else {
    ctx.fillText(`${playerNames[state.turn]}'s turn`, layout.centerX, layout.height - 24)
  }
}

export function drawPlaced(
  ctx: CanvasRenderingContext2D,
  placed: PlacedCard,
  cx: number,
  cy: number,
  size: number,
  highlight: boolean
): void {
  drawCardFace(ctx, placed.def, placed.owner, cx, cy, size, highlight)
}

export function drawMenuBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#0a1628')
  g.addColorStop(1, '#1a2840')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function drawTitle(ctx: CanvasRenderingContext2D, w: number, y: number, text: string): void {
  ctx.textAlign = 'center'
  ctx.font = 'bold 42px Georgia, serif'
  ctx.fillStyle = '#e8d8a8'
  ctx.strokeStyle = '#2a2010'
  ctx.lineWidth = 3
  ctx.strokeText(text, w / 2, y)
  ctx.fillText(text, w / 2, y)
}
