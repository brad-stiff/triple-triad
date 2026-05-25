import type { CardDefinition, PlayerId } from './types'

const PLACE_MS = 220
const FLIP_MS = 180

export interface PlaceAnim {
  kind: 'place'
  card: CardDefinition
  owner: PlayerId
  fromX: number
  fromY: number
  toX: number
  toY: number
  boardIndex: number
  startedAt: number
}

export interface FlipAnim {
  kind: 'flip'
  boardIndices: number[]
  startedAt: number
}

export type MatchAnim = PlaceAnim | FlipAnim

export function createPlaceAnim(
  card: CardDefinition,
  owner: PlayerId,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  boardIndex: number
): PlaceAnim {
  return {
    kind: 'place',
    card,
    owner,
    fromX,
    fromY,
    toX,
    toY,
    boardIndex,
    startedAt: performance.now()
  }
}

export function createFlipAnim(boardIndices: number[]): FlipAnim {
  return {
    kind: 'flip',
    boardIndices,
    startedAt: performance.now()
  }
}

export function animProgress(anim: MatchAnim, now = performance.now()): number {
  const elapsed = now - anim.startedAt
  const duration = anim.kind === 'place' ? PLACE_MS : FLIP_MS
  return Math.min(1, elapsed / duration)
}

export function isAnimDone(anim: MatchAnim, now = performance.now()): boolean {
  return animProgress(anim, now) >= 1
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export function placeAnimPosition(anim: PlaceAnim, now = performance.now()): { x: number; y: number } {
  const t = easeOut(animProgress(anim, now))
  return {
    x: anim.fromX + (anim.toX - anim.fromX) * t,
    y: anim.fromY + (anim.toY - anim.fromY) * t
  }
}

export function flipHighlightAlpha(anim: FlipAnim, now = performance.now()): number {
  const t = animProgress(anim, now)
  return t < 0.5 ? t * 2 : (1 - t) * 2
}
