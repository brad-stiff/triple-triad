import { buildMatchHands } from './deck'
import { loadProfile } from './profile'
import {
  createEmptyElementBoard,
  createRandomElementBoard,
  type ElementBoard
} from './elemental'
import { DEFAULT_RULES } from './rules'
import {
  countBoardScore,
  countSuddenDeathScore,
  formatResolutionMessage,
  otherPlayer,
  resolveCaptures
} from './resolve'
import type { PlacementResolution } from './placeResult'
import type {
  Board,
  CardDefinition,
  MatchConfig,
  MatchResult,
  MatchState,
  PlayerId
} from './types'

export interface PlaceEvent {
  player: PlayerId
  handIndex: number
  boardIndex: number
  card: CardDefinition
  resolution: PlacementResolution
  flippedBoardIndices: number[]
}

export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => null)
}

export function boardIsFull(board: Board): boolean {
  return board.every((cell) => cell !== null)
}

export function isMatchOver(state: MatchState): boolean {
  return boardIsFull(state.board)
}

export function createMatch(config: MatchConfig): MatchState {
  const rules = config.rules ?? DEFAULT_RULES
  const profile = loadProfile()
  const elements: ElementBoard = rules.elemental
    ? createRandomElementBoard()
    : createEmptyElementBoard()

  const p0Deck = config.player0DeckIds ?? profile.selectedDeckIds
  const p1Deck =
    config.player1DeckIds ??
    (config.cpuPlayer !== null ? undefined : profile.selectedDeckIds)

  return {
    board: createEmptyBoard(),
    hands: buildMatchHands(rules, p0Deck, p1Deck),
    rules,
    elements,
    cpuPlayer: config.cpuPlayer ?? null,
    turn: config.firstPlayer,
    selectedHandIndex: null,
    selectedBoardIndex: null,
    lastResolutionMessage: null,
    playedCardIds: [[], []]
  }
}

export function handCardCount(state: MatchState, player: PlayerId): number {
  return state.hands[player].length
}

export function finalizeMatch(state: MatchState): MatchResult {
  const scores = state.rules.suddenDeath
    ? countSuddenDeathScore(state)
    : countBoardScore(state.board)
  let winner: PlayerId | null = null
  if (scores[0] > scores[1]) winner = 0
  else if (scores[1] > scores[0]) winner = 1
  return { scores, winner }
}

export function canPlace(state: MatchState, boardIndex: number): boolean {
  return state.board[boardIndex] === null
}

function snapshotOwners(board: Board): (PlayerId | null)[] {
  return board.map((c) => (c ? c.owner : null))
}

export function placeCard(
  state: MatchState,
  handIndex: number,
  boardIndex: number
): PlaceEvent | null {
  if (state.selectedHandIndex === null && handIndex < 0) return null
  const idx = handIndex >= 0 ? handIndex : state.selectedHandIndex
  if (idx === null) return null
  if (!canPlace(state, boardIndex)) return null

  const hand = state.hands[state.turn]
  const cardDef = hand[idx]
  if (!cardDef) return null

  state.lastResolutionMessage = null

  const ownersBefore = snapshotOwners(state.board)
  const placed = { def: cardDef, owner: state.turn }
  state.board[boardIndex] = placed
  hand.splice(idx, 1)
  state.playedCardIds[state.turn].push(cardDef.id)

  const resolution = resolveCaptures(
    state.board,
    state.elements,
    boardIndex,
    placed,
    state.rules
  )
  state.lastResolutionMessage = formatResolutionMessage(resolution)

  const flippedBoardIndices: number[] = []
  for (let i = 0; i < 9; i++) {
    if (i === boardIndex) continue
    const before = ownersBefore[i]
    const cell = state.board[i]
    if (before !== null && cell && before !== cell.owner) {
      flippedBoardIndices.push(i)
    }
  }

  state.selectedHandIndex = null
  state.selectedBoardIndex = null

  return {
    player: placed.owner,
    handIndex: idx,
    boardIndex,
    card: cardDef,
    resolution,
    flippedBoardIndices
  }
}

export function selectHandCard(state: MatchState, index: number): void {
  if (index < 0 || index >= state.hands[state.turn].length) return
  if (state.selectedHandIndex === index) {
    state.selectedHandIndex = null
    state.selectedBoardIndex = null
    return
  }
  state.selectedHandIndex = index
  state.selectedBoardIndex = null
}

export function selectBoardCell(state: MatchState, index: number): PlaceEvent | null {
  if (index < 0 || index > 8) return null

  if (state.selectedHandIndex === null) {
    if (state.board[index]) return null
    state.selectedBoardIndex = index
    return null
  }

  if (state.selectedBoardIndex === index) {
    return placeCard(state, state.selectedHandIndex, index)
  }

  state.selectedBoardIndex = index
  if (canPlace(state, index)) {
    return placeCard(state, state.selectedHandIndex, index)
  }
  return null
}

export function getTurnHand(state: MatchState): CardDefinition[] {
  return state.hands[state.turn]
}

export function advanceTurn(state: MatchState): void {
  if (!isMatchOver(state)) {
    state.turn = otherPlayer(state.turn)
  }
}

