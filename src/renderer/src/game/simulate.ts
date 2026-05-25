import type { ElementBoard } from './elemental'
import { resolvePlacement, type PlacementResolution } from './placeResult'
import {
  RANK_BOTTOM,
  RANK_LEFT,
  RANK_RIGHT,
  RANK_TOP,
  type Board,
  type CardDefinition,
  type PlacedCard,
  type PlayerId
} from './types'
import type { RuleSet } from './rules'

function cloneBoard(board: Board): Board {
  return board.map((c) => (c ? { def: c.def, owner: c.owner } : null))
}

/** Rank-diff heuristic for defensive placement (reference AI formula). */
export function getRankDiff(
  board: Board,
  elements: ElementBoard,
  card: CardDefinition,
  position: number
): number {
  let totalRank = 0
  let sides = 0

  const addSide = (side: number, neighborPos: number): void => {
    if (board[neighborPos] !== null) return
    let rank = card.ranks[side]
    const cellElement = elements[position]
    if (cellElement !== 'NEUTRAL') {
      rank += card.element === cellElement ? 1 : -1
    }
    totalRank += rank
    sides++
  }

  if (position % 3 !== 0) addSide(RANK_LEFT, position - 1)
  if (position % 3 !== 2) addSide(RANK_RIGHT, position + 1)
  if (position > 2) addSide(RANK_TOP, position - 3)
  if (position < 6) addSide(RANK_BOTTOM, position + 3)

  return Math.max(sides * 10 - totalRank, 0)
}

function sideRankDiff(
  board: Board,
  elements: ElementBoard,
  position: number,
  owner: PlayerId
): number {
  let totalRank = 0
  let sides = 0

  const addOwned = (neighborPos: number, side: number): void => {
    const neighbor = board[neighborPos]
    if (!neighbor || neighbor.owner !== owner) return
    let rank = neighbor.def.ranks[side]
    const cellElement = elements[neighborPos]
    if (cellElement !== 'NEUTRAL') {
      rank += neighbor.def.element === cellElement ? 1 : -1
    }
    totalRank += rank
    sides++
  }

  if (position % 3 !== 0) addOwned(position - 1, RANK_RIGHT)
  if (position % 3 !== 2) addOwned(position + 1, RANK_LEFT)
  if (position > 2) addOwned(position - 3, RANK_BOTTOM)
  if (position < 6) addOwned(position + 3, RANK_TOP)

  return sides * 10 - totalRank
}

function boardRankDiff(
  board: Board,
  elements: ElementBoard,
  owner: PlayerId
): number {
  let total = 0
  for (let i = 0; i < 9; i++) {
    const cell = board[i]
    if (cell && cell.owner === owner) {
      total += getRankDiff(board, elements, cell.def, i)
    }
  }
  return total
}

export function simulateMove(
  board: Board,
  elements: ElementBoard,
  hand: CardDefinition[],
  owner: PlayerId,
  handIndex: number,
  boardPos: number,
  rules: RuleSet
): PlacementResolution | null {
  if (board[boardPos] !== null) return null
  const card = hand[handIndex]
  if (!card) return null

  const trial = cloneBoard(board)
  const placed: PlacedCard = { def: card, owner }
  trial[boardPos] = placed
  return resolvePlacement(trial, elements, boardPos, placed, rules)
}

export function emptyBoardSpaces(board: Board): number[] {
  const spaces: number[] = []
  for (let i = 0; i < 9; i++) {
    if (!board[i]) spaces.push(i)
  }
  return spaces
}

export function pickMinRankDiffMove(
  board: Board,
  elements: ElementBoard,
  hand: CardDefinition[],
  owner: PlayerId,
  _rules: RuleSet
): { handIndex: number; boardIndex: number } | null {
  const spaces = emptyBoardSpaces(board)
  if (spaces.length === 0 || hand.length === 0) return null

  const handSize = hand.length
  const useLowestLevel = spaces.length % 2 > 0 || handSize !== 2
  const baseDiff = boardRankDiff(board, elements, owner)

  let best: { handIndex: number; boardIndex: number } | null = null
  let minTotal = Number.MAX_VALUE
  let nextLevel = -1

  for (const space of spaces) {
    const sideDiff = sideRankDiff(board, elements, space, owner)
    for (let index = 0; index < handSize; index++) {
      const c = hand[index]
      const total = baseDiff + getRankDiff(board, elements, c, space) - sideDiff
      if (
        total < minTotal ||
        (total === minTotal &&
          ((useLowestLevel && c.level < nextLevel) || (!useLowestLevel && c.level > nextLevel)))
      ) {
        minTotal = total
        nextLevel = c.level
        best = { handIndex: index, boardIndex: space }
      }
    }
  }
  return best
}
