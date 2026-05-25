import { getPlayableCardPool } from './elemental'
import { buildStarterHand } from './constants'
import { DECK_SIZE, getDeckDefinitions, loadProfile } from './profile'
import type { CardDefinition } from './types'
import type { RuleSet } from './rules'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function buildHand(rules: RuleSet, playerDeckIds?: number[]): CardDefinition[] {
  const profile = loadProfile()
  const ownedIds = playerDeckIds ?? profile.ownedCardIds

  if (rules.random) {
    const pool = getPlayableCardPool()
    const allowed =
      ownedIds.length >= DECK_SIZE ? pool.filter((c) => ownedIds.includes(c.id)) : pool
    return shuffle(allowed).slice(0, DECK_SIZE)
  }

  const deck = getDeckDefinitions(profile)
  if (deck.length === DECK_SIZE) return deck
  return buildStarterHand()
}

export function buildMatchHands(
  rules: RuleSet,
  player0Deck?: number[],
  player1Deck?: number[]
): [CardDefinition[], CardDefinition[]] {
  return [buildHand(rules, player0Deck), buildHand(rules, player1Deck)]
}
