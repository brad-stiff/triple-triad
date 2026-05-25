import type { ElementBoard } from './elemental'
import {
  emptyBoardSpaces,
  getRankDiff,
  pickMinRankDiffMove,
  simulateMove
} from './simulate'
import type { Board, CardDefinition, MatchState, PlayerId } from './types'
import type { RuleSet } from './rules'

export type AiDifficulty = 'easy' | 'normal' | 'hard'

export const AI_DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard'
}

export interface AiMove {
  handIndex: number
  boardIndex: number
}

function handScore(state: MatchState, player: PlayerId): number {
  return state.hands[player].length
}

function useLowestLevel(spacesCount: number, handSize: number): boolean {
  return spacesCount % 2 > 0 || handSize !== 2
}

function pickRandomMove(
  board: Board,
  hand: CardDefinition[]
): AiMove | null {
  const spaces = emptyBoardSpaces(board)
  if (spaces.length === 0 || hand.length === 0) return null
  return {
    handIndex: Math.floor(Math.random() * hand.length),
    boardIndex: spaces[Math.floor(Math.random() * spaces.length)]
  }
}

function pickOffensiveMove(
  board: Board,
  elements: ElementBoard,
  hand: CardDefinition[],
  owner: PlayerId,
  rules: RuleSet
): AiMove | null {
  const spaces = emptyBoardSpaces(board)
  const handSize = hand.length
  if (spaces.length === 0) return null

  const lowest = useLowestLevel(spaces.length, handSize)
  let maxCapture = -1
  let nextLevel = -1
  let best: AiMove | null = null

  for (const space of spaces) {
    for (let index = 0; index < handSize; index++) {
      const c = hand[index]
      const res = simulateMove(board, elements, hand, owner, index, space, rules)
      const captured = res?.flippedCount ?? 0
      if (
        captured > maxCapture ||
        (captured === maxCapture &&
          ((lowest && c.level < nextLevel) || (!lowest && c.level > nextLevel)))
      ) {
        maxCapture = captured
        nextLevel = c.level
        best = { handIndex: index, boardIndex: space }
      }
    }
  }

  if (maxCapture === 0) {
    return pickMinRankDiffMove(board, elements, hand, owner, rules)
  }
  return best
}

function pickBalancedMove(
  board: Board,
  elements: ElementBoard,
  hand: CardDefinition[],
  owner: PlayerId,
  rules: RuleSet,
  thisScore: number,
  thatScore: number
): AiMove | null {
  const spaces = emptyBoardSpaces(board)
  const handSize = hand.length
  if (spaces.length === 0) return null

  const lowest = useLowestLevel(spaces.length, handSize)
  const isLosing = thisScore < thatScore

  let maxCapture = -1
  let nextRankDiff = 41
  let nextLevel = -1
  let best: AiMove | null = null

  for (const space of spaces) {
    for (let index = 0; index < handSize; index++) {
      const c = hand[index]
      const res = simulateMove(board, elements, hand, owner, index, space, rules)
      const captured = res?.flippedCount ?? 0
      const rankDiff = getRankDiff(board, elements, c, space)

      let valid = false
      if (maxCapture === -1) {
        valid = true
      } else if (captured > maxCapture) {
        if (captured > 2 || nextRankDiff - rankDiff > -5 || isLosing) valid = true
      } else if (captured === maxCapture) {
        if (
          rankDiff < nextRankDiff ||
          (rankDiff === nextRankDiff &&
            ((lowest && c.level < nextLevel) || (!lowest && c.level > nextLevel)))
        ) {
          valid = true
        }
      } else if (captured === maxCapture - 1 && !isLosing) {
        if (nextRankDiff - rankDiff > 5) valid = true
      }

      if (valid) {
        maxCapture = captured
        nextRankDiff = rankDiff
        nextLevel = c.level
        best = { handIndex: index, boardIndex: space }
      }
    }
  }

  if (maxCapture === 0 && spaces.length !== 9) {
    return pickMinRankDiffMove(board, elements, hand, owner, rules)
  }
  return best
}

export function chooseAiMove(
  state: MatchState,
  cpuPlayer: PlayerId,
  difficulty: AiDifficulty
): AiMove | null {
  const hand = state.hands[cpuPlayer]
  const human = cpuPlayer === 0 ? 1 : 0
  const thisScore = handScore(state, cpuPlayer)
  const thatScore = handScore(state, human)

  if (difficulty === 'easy') {
    return pickRandomMove(state.board, hand)
  }
  if (difficulty === 'hard') {
    return pickOffensiveMove(state.board, state.elements, hand, cpuPlayer, state.rules)
  }
  return pickBalancedMove(
    state.board,
    state.elements,
    hand,
    cpuPlayer,
    state.rules,
    thisScore,
    thatScore
  )
}
