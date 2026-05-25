import { resolvePlacement } from './placeResult'
import type { ElementBoard } from './elemental'
import type { RuleSet } from './rules'
import type { Board, MatchState, PlacedCard, PlayerId } from './types'

export { resolvePlacement, formatResolutionMessage } from './placeResult'
export type { PlacementResolution } from './placeResult'

export function resolveCaptures(
  board: Board,
  elements: ElementBoard,
  placedPos: number,
  placed: PlacedCard,
  rules: RuleSet
) {
  return resolvePlacement(board, elements, placedPos, placed, rules)
}

export function countBoardScore(board: Board): [number, number] {
  let p0 = 0
  let p1 = 0
  for (const cell of board) {
    if (!cell) continue
    if (cell.owner === 0) p0++
    else p1++
  }
  return [p0, p1]
}

/** Sudden Death: board + remaining hand cards */
export function countSuddenDeathScore(state: MatchState): [number, number] {
  const scores = countBoardScore(state.board)
  scores[0] += state.hands[0].length
  scores[1] += state.hands[1].length
  return scores
}

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 0 ? 1 : 0
}
