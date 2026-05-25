export interface RuleSet {
  open: boolean
  same: boolean
  plus: boolean
  random: boolean
  elemental: boolean
  sameWall: boolean
  suddenDeath: boolean
}

export type RuleKey = keyof RuleSet

export const RULE_LABELS: Record<RuleKey, string> = {
  open: 'Open',
  same: 'Same',
  plus: 'Plus',
  random: 'Random',
  elemental: 'Elemental',
  sameWall: 'Same Wall',
  suddenDeath: 'Sudden Death'
}

/** Balamb — Open only */
export const DEFAULT_RULES: RuleSet = {
  open: true,
  same: false,
  plus: false,
  random: false,
  elemental: false,
  sameWall: false,
  suddenDeath: false
}

export interface RulePreset {
  id: string
  name: string
  rules: RuleSet
}

export const RULE_PRESETS: RulePreset[] = [
  { id: 'balamb', name: 'Balamb', rules: { ...DEFAULT_RULES } },
  {
    id: 'galbadia',
    name: 'Galbadia',
    rules: { open: false, same: true, plus: false, random: false, elemental: false, sameWall: false, suddenDeath: false }
  },
  {
    id: 'dollet',
    name: 'Dollet',
    rules: { open: false, same: false, plus: false, random: true, elemental: true, sameWall: false, suddenDeath: false }
  },
  {
    id: 'trabia',
    name: 'Trabia',
    rules: { open: false, same: false, plus: true, random: true, elemental: false, sameWall: false, suddenDeath: false }
  },
  {
    id: 'centra',
    name: 'Centra',
    rules: { open: false, same: true, plus: true, random: true, elemental: false, sameWall: false, suddenDeath: false }
  },
  {
    id: 'fh',
    name: "Fisherman's Horizon",
    rules: { open: false, same: false, plus: false, random: false, elemental: true, sameWall: false, suddenDeath: true }
  },
  {
    id: 'esthar',
    name: 'Esthar',
    rules: { open: false, same: false, plus: false, random: false, elemental: true, sameWall: true, suddenDeath: false }
  },
  {
    id: 'lunar',
    name: 'Lunar',
    rules: {
      open: true,
      same: true,
      plus: true,
      random: true,
      elemental: true,
      sameWall: true,
      suddenDeath: true
    }
  }
]

export function formatRules(rules: RuleSet): string {
  const parts: string[] = []
  for (const key of Object.keys(RULE_LABELS) as RuleKey[]) {
    if (rules[key]) parts.push(RULE_LABELS[key])
  }
  if ((rules.same || rules.plus) && !parts.includes('Combo')) parts.push('Combo')
  return parts.length > 0 ? parts.join(', ') : 'Normal'
}

export function comboActive(rules: RuleSet): boolean {
  return rules.same || rules.plus
}

export function toggleRule(rules: RuleSet, key: RuleKey): RuleSet {
  return { ...rules, [key]: !rules[key] }
}

export function cloneRules(rules: RuleSet): RuleSet {
  return { ...rules }
}
