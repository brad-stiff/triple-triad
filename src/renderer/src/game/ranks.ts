import type { ElementBoard } from './elemental'
import type { Board, PlacedCard, PlayerId } from './types'

/** Wall / Same Wall uses rank A = 10 */
export const WALL_RANK = 10

export function effectiveRank(
  card: PlacedCard,
  side: number,
  position: number,
  elements: ElementBoard
): number {
  let rank = card.def.ranks[side]
  const cellElement = elements[position]
  if (cellElement !== 'NEUTRAL') {
    rank += card.def.element === cellElement ? 1 : -1
  }
  return rank
}

export function rankBeats(
  board: Board,
  elements: ElementBoard,
  sourcePos: number,
  sourceSide: number,
  targetPos: number,
  targetSide: number,
  sourceOwner: PlayerId,
  targetOwner: PlayerId
): boolean {
  if (sourceOwner === targetOwner) return false
  const source = board[sourcePos]
  const target = board[targetPos]
  if (!source || !target) return false
  const sourceRank = effectiveRank(source, sourceSide, sourcePos, elements)
  const targetRank = effectiveRank(target, targetSide, targetPos, elements)
  return sourceRank > targetRank
}
