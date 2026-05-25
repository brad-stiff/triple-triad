import type { ElementBoard } from './elemental'
import { comboActive, type RuleSet } from './rules'
import { rankBeats, WALL_RANK } from './ranks'
import {
  RANK_BOTTOM,
  RANK_LEFT,
  RANK_RIGHT,
  RANK_TOP,
  type Board,
  type PlacedCard,
  type PlayerId
} from './types'

export interface PlacementResolution {
  primary: 'same' | 'plus' | null
  comboWaves: number
  flippedCount: number
}

export function formatResolutionMessage(res: PlacementResolution): string | null {
  if (res.primary === 'same') {
    return res.comboWaves > 0 ? 'Same — Combo!' : 'Same!'
  }
  if (res.primary === 'plus') {
    return res.comboWaves > 0 ? 'Plus — Combo!' : 'Plus!'
  }
  return null
}

interface Adjacency {
  sourceSide: number
  neighborPos: number
  neighborSide: number
}

function adjacencies(position: number): Adjacency[] {
  const list: Adjacency[] = []
  if (position % 3 !== 0) {
    list.push({ sourceSide: RANK_LEFT, neighborPos: position - 1, neighborSide: RANK_RIGHT })
  }
  if (position % 3 !== 2) {
    list.push({ sourceSide: RANK_RIGHT, neighborPos: position + 1, neighborSide: RANK_LEFT })
  }
  if (position > 2) {
    list.push({ sourceSide: RANK_TOP, neighborPos: position - 3, neighborSide: RANK_BOTTOM })
  }
  if (position < 6) {
    list.push({ sourceSide: RANK_BOTTOM, neighborPos: position + 3, neighborSide: RANK_TOP })
  }
  return list
}

function hasOpponent(cards: PlacedCard[], placer: PlayerId): boolean {
  return cards.some((c) => c.owner !== placer)
}

function removeFromCaptured(captured: PlacedCard[], exclude: PlacedCard[]): void {
  for (let i = captured.length - 1; i >= 0; i--) {
    if (exclude.includes(captured[i])) captured.splice(i, 1)
  }
}

function detectSameWall(placedPos: number, placed: PlacedCard, rules: RuleSet): boolean {
  if (!rules.sameWall) return false
  if (placedPos % 3 === 0 && placed.def.ranks[RANK_LEFT] === WALL_RANK) return true
  if (placedPos % 3 === 2 && placed.def.ranks[RANK_RIGHT] === WALL_RANK) return true
  if (placedPos < 3 && placed.def.ranks[RANK_TOP] === WALL_RANK) return true
  if (placedPos > 5 && placed.def.ranks[RANK_BOTTOM] === WALL_RANK) return true
  return false
}

function computeComboWaves(
  board: Board,
  elements: ElementBoard,
  seed: PlacedCard[],
  placer: PlayerId
): PlacedCard[][] {
  const owners: (PlayerId | null)[] = board.map((c) => (c ? c.owner : null))
  const waves: PlacedCard[][] = []

  const runWave = (resultList: PlacedCard[]): void => {
    for (const c of resultList) {
      const pos = board.indexOf(c)
      if (pos >= 0) owners[pos] = placer
    }

    const comboSet = new Set<number>()
    for (const c of resultList) {
      if (c.owner === placer) continue
      const pos = board.indexOf(c)
      if (pos < 0) continue

      for (const { sourceSide, neighborPos, neighborSide } of adjacencies(pos)) {
        const neighborOwner = owners[neighborPos]
        if (neighborOwner === null || neighborOwner === undefined) continue
        if (
          rankBeats(
            board,
            elements,
            pos,
            sourceSide,
            neighborPos,
            neighborSide,
            owners[pos]!,
            neighborOwner
          )
        ) {
          comboSet.add(neighborPos)
        }
      }
    }

    if (comboSet.size === 0) return

    const comboList: PlacedCard[] = []
    for (const pos of comboSet) {
      const card = board[pos]
      if (card) comboList.push(card)
    }

    waves.push(comboList)
    runWave(comboList)
  }

  runWave(seed)
  return waves
}

export function resolvePlacement(
  board: Board,
  elements: ElementBoard,
  placedPos: number,
  placed: PlacedCard,
  rules: RuleSet
): PlacementResolution {
  const captured: PlacedCard[] = []
  let same: PlacedCard[] | null = rules.same ? [] : null
  const plusSums = rules.plus
    ? { sums: [] as number[], groups: new Map<number, PlacedCard[]>() }
    : null

  const sameWall = detectSameWall(placedPos, placed, rules)
  const sameMinMatches = sameWall && rules.sameWall ? 1 : 2

  for (const { sourceSide, neighborPos, neighborSide } of adjacencies(placedPos)) {
    const target = board[neighborPos]
    if (!target) continue

    const sourceRank = placed.def.ranks[sourceSide]
    const targetRank = target.def.ranks[neighborSide]

    if (same && sourceRank === targetRank) {
      same.push(target)
    }

    if (plusSums) {
      const sum = sourceRank + targetRank
      let group = plusSums.groups.get(sum)
      if (!group) {
        group = []
        plusSums.groups.set(sum, group)
        plusSums.sums.push(sum)
      }
      group.push(target)
    }

    if (
      rankBeats(
        board,
        elements,
        placedPos,
        sourceSide,
        neighborPos,
        neighborSide,
        placed.owner,
        target.owner
      )
    ) {
      captured.push(target)
    }
  }

  let plus: PlacedCard[] | null = null
  let primary: 'same' | 'plus' | null = null
  const comboWaves: PlacedCard[][] = []

  if (same && same.length >= sameMinMatches && hasOpponent(same, placed.owner)) {
    primary = 'same'
    removeFromCaptured(captured, same)
    if (comboActive(rules)) {
      comboWaves.push(...computeComboWaves(board, elements, same, placed.owner))
    }
  } else {
    same = null
  }

  if (!primary && plusSums) {
    for (const sum of plusSums.sums) {
      const group = plusSums.groups.get(sum)!
      if (group.length >= 2 && hasOpponent(group, placed.owner)) {
        plus = group
        primary = 'plus'
        removeFromCaptured(captured, plus)
        if (comboActive(rules)) {
          comboWaves.push(...computeComboWaves(board, elements, plus, placed.owner))
        }
        break
      }
    }
  }

  const placer = placed.owner
  let flippedCount = 0

  const flipOpponents = (cards: PlacedCard[]): void => {
    for (const c of cards) {
      if (c.owner !== placer) {
        c.owner = placer
        flippedCount++
      }
    }
  }

  if (same) flipOpponents(same)
  else if (plus) flipOpponents(plus)

  if (captured.length > 0) flipOpponents(captured)

  for (const wave of comboWaves) {
    flipOpponents(wave)
  }

  return {
    primary,
    comboWaves: comboWaves.length,
    flippedCount
  }
}
