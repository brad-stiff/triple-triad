import { CARD_DEFINITIONS } from '../data/cards'
import { DECK_SIZE, type PlayerProfile } from '../game/profile'
import type { Rect } from './controls'

export interface CollectionCardCell {
  cardId: number
  name: string
  inDeck: boolean
  owned: boolean
  rect: Rect
}

export interface CollectionLayout {
  cells: CollectionCardCell[]
  backButton: Rect
  sfxButton: Rect
  scrollOffset: number
  maxScroll: number
  cols: number
}

const CELL_W = 100
const CELL_H = 118
const GAP = 10
const TOP = 118
const SIDE_PAD = 24

export function buildCollectionLayout(
  width: number,
  height: number,
  profile: PlayerProfile,
  scrollOffset: number
): CollectionLayout {
  const owned = new Set(profile.ownedCardIds)
  const deck = new Set(profile.selectedDeckIds)
  const cols = Math.max(4, Math.floor((width - SIDE_PAD * 2) / (CELL_W + GAP)))
  const ownedCards = CARD_DEFINITIONS.filter((c) => owned.has(c.id))

  const cells: CollectionCardCell[] = ownedCards.map((c, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      cardId: c.id,
      name: c.name,
      inDeck: deck.has(c.id),
      owned: true,
      rect: {
        x: SIDE_PAD + col * (CELL_W + GAP),
        y: TOP + row * (CELL_H + GAP) - scrollOffset,
        w: CELL_W,
        h: CELL_H
      }
    }
  })

  const rows = Math.ceil(ownedCards.length / cols)
  const contentH = rows * (CELL_H + GAP)
  const viewH = height - TOP - 100
  const maxScroll = Math.max(0, contentH - viewH)

  const btnW = 200
  const btnH = 40
  return {
    cells,
    backButton: { x: width / 2 - btnW / 2, y: height - 56, w: btnW, h: btnH },
    sfxButton: { x: width - 160, y: 72, w: 140, h: 32 },
    scrollOffset,
    maxScroll,
    cols
  }
}

export function hitCollectionCell(
  layout: CollectionLayout,
  x: number,
  y: number
): number | null {
  for (const cell of layout.cells) {
    const { x: cx, y: cy, w, h } = cell.rect
    if (x >= cx && x < cx + w && y >= cy && y < cy + h) return cell.cardId
  }
  return null
}

export function drawCollectionCell(
  ctx: CanvasRenderingContext2D,
  cell: CollectionCardCell,
  thumb: HTMLImageElement | undefined,
  hovered: boolean
): void {
  const { x, y, w, h } = cell.rect
  if (y + h < TOP || y > ctx.canvas.height) return

  ctx.fillStyle = cell.inDeck ? '#3a5a8a' : '#2a3040'
  if (hovered) ctx.fillStyle = cell.inDeck ? '#4a6a9e' : '#3a4050'
  ctx.strokeStyle = cell.inDeck ? '#e8d8a0' : '#666'
  ctx.lineWidth = cell.inDeck ? 2 : 1
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)

  if (thumb) {
    ctx.drawImage(thumb, x + 6, y + 6, w - 12, h - 36)
  } else {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(x + 6, y + 6, w - 12, h - 36)
  }

  ctx.fillStyle = '#e8e0d0'
  ctx.font = '11px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  const label = cell.name.length > 12 ? cell.name.slice(0, 11) + '…' : cell.name
  ctx.fillText(label, x + w / 2, y + h - 4)

  if (cell.inDeck) {
    ctx.fillStyle = '#b8e8b8'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('IN DECK', x + w / 2, y + 14)
  }
}

export function formatDeckStatus(profile: PlayerProfile): string {
  return `Deck: ${profile.selectedDeckIds.length}/${DECK_SIZE} · Owned: ${profile.ownedCardIds.length}`
}
