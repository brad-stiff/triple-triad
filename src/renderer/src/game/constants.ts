import { getCardById } from '../data/cards'
import type { CardDefinition } from './types'

/** Default five-card hand used until collection/deck-building is implemented */
export const STARTER_CARD_IDS = [1, 2, 3, 4, 5] as const

export function buildStarterHand(): CardDefinition[] {
  return STARTER_CARD_IDS.map((id) => {
    const card = getCardById(id)
    if (!card) throw new Error(`Missing starter card ${id}`)
    return card
  })
}

export { DEFAULT_RULES, formatRules, cloneRules, RULE_PRESETS, RULE_LABELS } from './rules'
export type { RuleSet, RuleKey } from './rules'

export const RANK_LABELS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A'] as const
