import { getCardById } from '../data/cards'
import { STARTER_CARD_IDS } from './constants'
import type { CardDefinition } from './types'

const STORAGE_KEY = 'triple-triad-profile'
export const DECK_SIZE = 5

export interface PlayerProfile {
  ownedCardIds: number[]
  /** Player's five-card deck (subset of owned) */
  selectedDeckIds: number[]
  wins: number
  losses: number
  sfxEnabled: boolean
}

function defaultProfile(): PlayerProfile {
  return {
    ownedCardIds: [...STARTER_CARD_IDS],
    selectedDeckIds: [...STARTER_CARD_IDS],
    wins: 0,
    losses: 0,
    sfxEnabled: true
  }
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProfile()
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>
    const base = defaultProfile()
    const owned = Array.isArray(parsed.ownedCardIds)
      ? [...new Set(parsed.ownedCardIds)].sort((a, b) => a - b)
      : base.ownedCardIds
    let deck = Array.isArray(parsed.selectedDeckIds) ? parsed.selectedDeckIds : base.selectedDeckIds
    deck = deck.filter((id) => owned.includes(id)).slice(0, DECK_SIZE)
    while (deck.length < DECK_SIZE && owned.length >= DECK_SIZE) {
      const next = owned.find((id) => !deck.includes(id))
      if (next === undefined) break
      deck.push(next)
    }
    if (deck.length < DECK_SIZE) deck = owned.slice(0, DECK_SIZE)
    return {
      ownedCardIds: owned,
      selectedDeckIds: deck,
      wins: parsed.wins ?? 0,
      losses: parsed.losses ?? 0,
      sfxEnabled: parsed.sfxEnabled !== false
    }
  } catch {
    return defaultProfile()
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function getDeckDefinitions(profile: PlayerProfile): CardDefinition[] {
  return profile.selectedDeckIds
    .map((id) => getCardById(id))
    .filter((c): c is CardDefinition => c !== undefined)
}

export function toggleDeckCard(profile: PlayerProfile, cardId: number): PlayerProfile {
  const owned = new Set(profile.ownedCardIds)
  if (!owned.has(cardId)) return profile

  const deck = [...profile.selectedDeckIds]
  const idx = deck.indexOf(cardId)
  if (idx >= 0) {
    deck.splice(idx, 1)
  } else if (deck.length < DECK_SIZE) {
    deck.push(cardId)
  }
  return { ...profile, selectedDeckIds: deck }
}

export function isDeckReady(profile: PlayerProfile): boolean {
  return (
    profile.selectedDeckIds.length === DECK_SIZE &&
    profile.selectedDeckIds.every((id) => profile.ownedCardIds.includes(id))
  )
}

export function recordMatchResult(
  winner: 0 | 1 | null,
  humanPlayer: 0 | 1 = 0
): void {
  const profile = loadProfile()
  if (winner === null) return
  if (winner === humanPlayer) profile.wins++
  else profile.losses++
  saveProfile(profile)
}

/** Win vs CPU: earn one card the CPU used that you don't own (FF8 "One"-style) */
export function earnCardFromOpponent(opponentPlayedIds: number[]): number | null {
  const profile = loadProfile()
  const owned = new Set(profile.ownedCardIds)
  const candidates = [...new Set(opponentPlayedIds)].filter((id) => !owned.has(id))
  if (candidates.length === 0) return null
  const earned = candidates[Math.floor(Math.random() * candidates.length)]
  owned.add(earned)
  profile.ownedCardIds = [...owned].sort((a, b) => a - b)
  saveProfile(profile)
  return earned
}

export function toggleSfx(profile: PlayerProfile): PlayerProfile {
  const next = { ...profile, sfxEnabled: !profile.sfxEnabled }
  saveProfile(next)
  return next
}
