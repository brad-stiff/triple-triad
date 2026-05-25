import { CARD_DEFINITIONS } from '../data/cards'
import type { Element } from './types'

const BOARD_ELEMENTS: Element[] = [
  'FIRE',
  'ICE',
  'THUNDER',
  'EARTH',
  'POISON',
  'WIND',
  'WATER',
  'HOLY'
]

/** Per-cell element; NEUTRAL = no elemental square */
export type ElementBoard = Element[]

export function createEmptyElementBoard(): ElementBoard {
  return Array.from({ length: 9 }, () => 'NEUTRAL' as Element)
}

/** FF8-style: four random elemental cells on the board */
export function createRandomElementBoard(): ElementBoard {
  const board = createEmptyElementBoard()
  const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  shuffleInPlace(positions)
  for (let i = 0; i < 4; i++) {
    const element = BOARD_ELEMENTS[Math.floor(Math.random() * BOARD_ELEMENTS.length)]
    board[positions[i]] = element
  }
  return board
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export function getPlayableCardPool(): typeof CARD_DEFINITIONS {
  return CARD_DEFINITIONS
}

export function elementLabel(element: Element): string {
  if (element === 'NEUTRAL') return ''
  return element.charAt(0) + element.slice(1).toLowerCase()
}
