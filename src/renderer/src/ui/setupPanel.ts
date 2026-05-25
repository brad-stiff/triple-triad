import { AI_DIFFICULTY_LABELS, type AiDifficulty } from '../game/ai'
import type { MatchMode } from '../game/types'
import {
  cloneRules,
  RULE_LABELS,
  RULE_PRESETS,
  toggleRule,
  type RuleKey,
  type RulePreset,
  type RuleSet
} from '../game/rules'
import { stackButtonsFromBottom, type Button } from './controls'
import type { Rect } from './controls'

export interface RuleToggleRow {
  key: RuleKey
  label: string
  enabled: boolean
  rect: Rect
}

export interface SetupOptionRow {
  id: 'mode' | 'difficulty'
  label: string
  rect: Rect
  enabled: boolean
}

export interface SetupScreenLayout {
  options: SetupOptionRow[]
  toggles: RuleToggleRow[]
  presets: { id: string; name: string; rect: Rect }[]
  /** Y for first line of player / deck hint text */
  playerInfoY: number
  actionButtons: Button[]
}

const TOGGLE_H = 34
const TOGGLE_GAP = 6
const PRESET_H = 32
const PRESET_GAP = 8
const OPTION_H = 32
const OPTION_GAP = 8
const FOOTER_TEXT_H = 48
const ACTION_BOTTOM_PAD = 20
const ACTION_BTN_H = 40
const ACTION_GAP = 10
const ACTION_COUNT = 3

function actionBlockHeight(): number {
  return ACTION_COUNT * ACTION_BTN_H + (ACTION_COUNT - 1) * ACTION_GAP
}

export function buildSetupLayout(
  width: number,
  height: number,
  rules: RuleSet,
  playerNames: [string, string],
  firstPlayer: 0 | 1,
  matchMode: MatchMode,
  aiDifficulty: AiDifficulty
): SetupScreenLayout {
  const keys = Object.keys(RULE_LABELS) as RuleKey[]
  const actionH = actionBlockHeight()
  const actionTop = height - ACTION_BOTTOM_PAD - actionH
  const playerInfoY = actionTop - FOOTER_TEXT_H
  const contentBottom = playerInfoY - 16

  const optionW = Math.min(320, width - 48)
  const optionX = (width - optionW) / 2
  const options: SetupOptionRow[] = [
    {
      id: 'mode',
      label: matchMode === 'cpu' ? 'Mode: vs CPU' : 'Mode: 2 Players',
      enabled: true,
      rect: { x: optionX, y: 108, w: optionW, h: OPTION_H }
    }
  ]
  if (matchMode === 'cpu') {
    options.push({
      id: 'difficulty',
      label: `AI: ${AI_DIFFICULTY_LABELS[aiDifficulty]}`,
      enabled: true,
      rect: { x: optionX, y: 108 + OPTION_H + OPTION_GAP, w: optionW, h: OPTION_H }
    })
  }

  const contentTop =
    108 +
    options.length * OPTION_H +
    (options.length - 1) * OPTION_GAP +
    12

  const narrow = width < 920
  const colW = Math.min(300, Math.floor((width - 48) / (narrow ? 1 : 2)))

  const toggles: RuleToggleRow[] = []
  const presets: SetupScreenLayout['presets'] = []

  if (narrow) {
    const x = (width - colW) / 2
    let y = contentTop
    for (const key of keys) {
      toggles.push({
        key,
        label: RULE_LABELS[key],
        enabled: rules[key],
        rect: { x, y, w: colW, h: TOGGLE_H }
      })
      y += TOGGLE_H + TOGGLE_GAP
    }
    y += 12
    const presetW = Math.min(160, Math.floor((width - 32) / 2))
    const presetGapX = 12
    const blockW = presetW * 2 + presetGapX
    const presetX0 = (width - blockW) / 2
    RULE_PRESETS.forEach((p, i) => {
      presets.push({
        id: p.id,
        name: p.name,
        rect: {
          x: presetX0 + (i % 2) * (presetW + presetGapX),
          y: y + Math.floor(i / 2) * (PRESET_H + PRESET_GAP),
          w: presetW,
          h: PRESET_H
        }
      })
    })
  } else {
    const colGap = 32
    const leftX = Math.floor(width / 2 - colW - colGap / 2)
    const rightX = Math.floor(width / 2 + colGap / 2)
    const presetW = colW

    keys.forEach((key, i) => {
      toggles.push({
        key,
        label: RULE_LABELS[key],
        enabled: rules[key],
        rect: { x: leftX, y: contentTop + i * (TOGGLE_H + TOGGLE_GAP), w: colW, h: TOGGLE_H }
      })
    })

    RULE_PRESETS.forEach((p, i) => {
      presets.push({
        id: p.id,
        name: p.name,
        rect: {
          x: rightX,
          y: contentTop + i * (PRESET_H + PRESET_GAP),
          w: presetW,
          h: PRESET_H
        }
      })
    })
  }

  // Clamp: if content would overlap footer, compress toggle spacing slightly
  const lastToggle = toggles[toggles.length - 1]
  const lastPreset = presets[presets.length - 1]
  const contentEnd = Math.max(
    lastToggle ? lastToggle.rect.y + lastToggle.rect.h : 0,
    lastPreset ? lastPreset.rect.y + lastPreset.rect.h : 0
  )
  if (contentEnd > contentBottom && toggles.length > 0) {
    const overflow = contentEnd - contentBottom
    const shift = Math.min(overflow, contentTop - 72)
    for (const t of toggles) t.rect.y -= shift
    for (const p of presets) p.rect.y -= shift
  }

  const firstLabel =
    matchMode === 'cpu'
      ? `First: ${firstPlayer === 0 ? 'You' : 'CPU'}`
      : `First: ${playerNames[firstPlayer]}`

  const actionButtons = stackButtonsFromBottom(
    width,
    height,
    ACTION_BOTTOM_PAD,
    [
      { id: 'swap-first', label: firstLabel },
      { id: 'start', label: 'Start Match' },
      { id: 'back', label: 'Back' }
    ],
    Math.min(280, width - 48),
    ACTION_BTN_H,
    ACTION_GAP
  )

  return { options, toggles, presets, playerInfoY, actionButtons }
}

export function hitSetupOption(
  options: SetupOptionRow[],
  x: number,
  y: number
): SetupOptionRow['id'] | null {
  for (const o of options) {
    if (!o.enabled) continue
    const { x: ox, y: oy, w, h } = o.rect
    if (x >= ox && x < ox + w && y >= oy && y < oy + h) return o.id
  }
  return null
}

export function drawSetupOption(
  ctx: CanvasRenderingContext2D,
  row: SetupOptionRow,
  hovered: boolean
): void {
  const { x, y, w, h } = row.rect
  ctx.fillStyle = row.enabled ? (hovered ? '#3d4d6d' : '#2d3a52') : '#222228'
  ctx.strokeStyle = '#b8a878'
  ctx.lineWidth = 1
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.font = 'bold 15px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = row.enabled ? '#f0e8d0' : '#666'
  ctx.fillText(row.label, x + w / 2, y + h / 2)
}

export function hitRuleToggle(toggles: RuleToggleRow[], x: number, y: number): RuleKey | null {
  for (const t of toggles) {
    const { x: tx, y: ty, w, h } = t.rect
    if (x >= tx && x < tx + w && y >= ty && y < ty + h) return t.key
  }
  return null
}

export function hitPreset(
  presets: SetupScreenLayout['presets'],
  x: number,
  y: number
): RulePreset | null {
  for (const p of presets) {
    const { x: px, y: py, w, h } = p.rect
    if (x >= px && x < px + w && y >= py && y < py + h) {
      return RULE_PRESETS.find((r) => r.id === p.id) ?? null
    }
  }
  return null
}

export function hitSetupAction(
  layout: SetupScreenLayout,
  x: number,
  y: number
): string | null {
  for (const b of layout.actionButtons) {
    const { x: bx, y: by, w, h } = b.rect
    if (x >= bx && x < bx + w && y >= by && y < by + h) return b.id
  }
  return null
}

export function applyToggle(rules: RuleSet, key: RuleKey): RuleSet {
  return toggleRule(rules, key)
}

export function applyPreset(preset: RulePreset): RuleSet {
  return cloneRules(preset.rules)
}

export function drawRuleToggle(
  ctx: CanvasRenderingContext2D,
  row: RuleToggleRow,
  hovered: boolean
): void {
  const { x, y, w, h } = row.rect
  ctx.fillStyle = row.enabled ? '#3a5a8a' : '#2a2a3a'
  if (hovered) ctx.fillStyle = row.enabled ? '#4a6a9a' : '#3a3a4a'
  ctx.strokeStyle = '#c8b888'
  ctx.lineWidth = 1
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)

  ctx.font = '15px Georgia, serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f0e8d0'
  ctx.fillText(row.label, x + 12, y + h / 2)

  ctx.textAlign = 'right'
  ctx.fillStyle = row.enabled ? '#b8e8b8' : '#888'
  ctx.fillText(row.enabled ? 'ON' : 'OFF', x + w - 12, y + h / 2)
}

export function drawPresetButton(
  ctx: CanvasRenderingContext2D,
  name: string,
  rect: Rect,
  hovered: boolean
): void {
  const { x, y, w, h } = rect
  ctx.fillStyle = hovered ? '#4a5a7a' : '#333d55'
  ctx.strokeStyle = '#a8a080'
  ctx.lineWidth = 1
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.fillStyle = '#e8e0d0'
  ctx.font = '12px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, x + w / 2, y + h / 2, w - 8)
}

export function drawSetupChrome(
  ctx: CanvasRenderingContext2D,
  width: number,
  rulesSummary: string,
  narrow: boolean,
  contentTop: number
): void {
  ctx.textAlign = 'center'
  ctx.fillStyle = '#d8e0f0'
  ctx.font = '16px Georgia, serif'
  ctx.fillText(`Active: ${rulesSummary}`, width / 2, 82)

  ctx.fillStyle = '#8898a8'
  ctx.font = '13px Georgia, serif'
  if (narrow) {
    ctx.fillText('Rules · Presets (tap)', width / 2, contentTop - 10)
  } else {
    ctx.textAlign = 'left'
    ctx.fillText('Rules', width / 2 - 168, contentTop - 10)
    ctx.fillText('Presets', width / 2 + 24, contentTop - 10)
  }
}
