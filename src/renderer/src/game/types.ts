export type Element =
  | 'NEUTRAL'
  | 'FIRE'
  | 'ICE'
  | 'THUNDER'
  | 'EARTH'
  | 'POISON'
  | 'WIND'
  | 'WATER'
  | 'HOLY'

/** [top, left, right, bottom] — A is stored as 10 */
export type Ranks = [number, number, number, number]

export interface CardDefinition {
  id: number
  name: string
  ranks: Ranks
  element: Element
  level: number
}

export type PlayerId = 0 | 1

export interface PlacedCard {
  def: CardDefinition
  owner: PlayerId
}

export type Board = (PlacedCard | null)[]

export const RANK_TOP = 0
export const RANK_LEFT = 1
export const RANK_RIGHT = 2
export const RANK_BOTTOM = 3

export type ScreenId = 'menu' | 'collection' | 'setup' | 'match' | 'result'

import type { ElementBoard } from './elemental'
import type { RuleSet } from './rules'

export type MatchMode = 'local' | 'cpu'

export interface MatchConfig {
  playerNames: [string, string]
  firstPlayer: PlayerId
  rules: RuleSet
  /** Which player is CPU-controlled; null for local 2P */
  cpuPlayer: PlayerId | null
  player0DeckIds?: number[]
  player1DeckIds?: number[]
}

export interface MatchState {
  board: Board
  hands: [CardDefinition[], CardDefinition[]]
  rules: RuleSet
  /** Element per board cell (NEUTRAL = no bonus) */
  elements: ElementBoard
  cpuPlayer: PlayerId | null
  turn: PlayerId
  selectedHandIndex: number | null
  /** Board cell hovered/selected for placement */
  selectedBoardIndex: number | null
  /** Last placement rule message (Same / Plus / Combo) */
  lastResolutionMessage: string | null
  /** Card IDs each player has placed this match (for earning cards) */
  playedCardIds: [number[], number[]]
}

export interface MatchResult {
  scores: [number, number]
  winner: PlayerId | null
}
