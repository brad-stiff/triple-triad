import {
  initSound,
  playCard,
  playInvalid,
  playMatchStart,
  playSelect,
  playSpecial,
  playTurn,
  setSoundMuted
} from './audio/sound'
import { getCardById } from './data/cards'
import { CARD_DEFINITIONS } from './data/cards'
import {
  AI_DIFFICULTY_LABELS,
  chooseAiMove,
  type AiDifficulty
} from './game/ai'
import {
  createFlipAnim,
  createPlaceAnim,
  isAnimDone,
  type MatchAnim
} from './game/animations'
import { DEFAULT_RULES, formatRules, cloneRules } from './game/constants'
import {
  advanceTurn,
  createMatch,
  finalizeMatch,
  handCardCount,
  isMatchOver,
  placeCard,
  selectBoardCell,
  selectHandCard,
  type PlaceEvent
} from './game/engine'
import {
  DECK_SIZE,
  earnCardFromOpponent,
  isDeckReady,
  loadProfile,
  recordMatchResult,
  saveProfile,
  toggleDeckCard,
  toggleSfx,
  type PlayerProfile
} from './game/profile'
import type { RuleKey, RuleSet } from './game/rules'
import type { MatchConfig, MatchMode, MatchResult, MatchState, PlayerId, ScreenId } from './game/types'
import { getCardImage, loadGameAssets } from './render/assets'
import {
  drawBoard,
  drawFloatingCard,
  drawFlipOverlay,
  drawHands,
  drawMenuBackground,
  drawTitle
} from './render/draw'
import {
  boardIndexAt,
  computeLayout,
  handCardCenter,
  handIndexAt,
  type Layout
} from './render/layout'
import { centerButtons, drawButton, hitButton, type Button } from './ui/controls'
import {
  applyPreset,
  applyToggle,
  buildSetupLayout,
  drawPresetButton,
  drawRuleToggle,
  drawSetupChrome,
  drawSetupOption,
  hitPreset,
  hitRuleToggle,
  hitSetupAction,
  hitSetupOption,
  type SetupScreenLayout
} from './ui/setupPanel'
import {
  buildCollectionLayout,
  drawCollectionCell,
  formatDeckStatus,
  hitCollectionCell,
  type CollectionLayout
} from './ui/collectionPanel'

const CPU_PLAYER: PlayerId = 1
const HUMAN_PLAYER: PlayerId = 0
const CPU_THINK_MS = 450

export class TripleTriadApp {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private layout: Layout = computeLayout(800, 600)
  private screen: ScreenId = 'menu'
  private buttons: Button[] = []
  private hoveredButton: string | null = null

  private matchMode: MatchMode = 'local'
  private aiDifficulty: AiDifficulty = 'normal'
  private playerNames: [string, string] = ['Player 1', 'Player 2']
  private firstPlayer: PlayerId = 0
  private selectedRules: RuleSet = cloneRules(DEFAULT_RULES)
  private setupLayout: SetupScreenLayout = buildSetupLayout(
    800,
    600,
    DEFAULT_RULES,
    ['Player 1', 'Player 2'],
    0,
    'local',
    'normal'
  )
  private hoveredRuleKey: RuleKey | null = null
  private hoveredPresetId: string | null = null
  private hoveredOptionId: string | null = null

  private profile: PlayerProfile = loadProfile()
  private collectionLayout: CollectionLayout = buildCollectionLayout(800, 600, this.profile, 0)
  private collectionScroll = 0
  private hoveredCollectionCard: number | null = null

  private match: MatchState | null = null
  private result: MatchResult | null = null
  private earnedCardId: number | null = null
  private assetsReady = false
  private cpuTurnTimer: ReturnType<typeof setTimeout> | null = null
  private inputLocked = false
  private currentAnim: MatchAnim | null = null
  private animQueue: MatchAnim[] = []

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D not available')
    this.canvas = canvas
    this.ctx = ctx
    this.resize()
    window.addEventListener('resize', () => this.resize())
    canvas.addEventListener('click', (e) => this.onClick(e))
    canvas.addEventListener('mousemove', (e) => this.onMove(e))
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.screen !== 'collection') return
        e.preventDefault()
        this.collectionScroll = Math.max(
          0,
          Math.min(
            this.collectionLayout.maxScroll,
            this.collectionScroll + e.deltaY * 0.4
          )
        )
        this.collectionLayout = buildCollectionLayout(
          this.layout.width,
          this.layout.height,
          this.profile,
          this.collectionScroll
        )
        this.render()
      },
      { passive: false }
    )
    void this.initAssets()
    this.goToMenu()
    this.startLoop()
  }

  private startLoop(): void {
    const loop = (): void => {
      requestAnimationFrame(loop)
      if (this.screen === 'match' && (this.currentAnim || this.inputLocked)) {
        this.render()
        if (this.currentAnim && isAnimDone(this.currentAnim)) {
          this.advanceAnimQueue()
        }
      }
    }
    loop()
  }

  private async initAssets(): Promise<void> {
    const ids = CARD_DEFINITIONS.map((c) => c.id)
    await loadGameAssets(ids)
    this.profile = loadProfile()
    await initSound(this.profile.sfxEnabled)
    this.assetsReady = true
    this.render()
  }

  private clearCpuTimer(): void {
    if (this.cpuTurnTimer !== null) {
      clearTimeout(this.cpuTurnTimer)
      this.cpuTurnTimer = null
    }
  }

  private updatePlayerNames(): void {
    this.playerNames =
      this.matchMode === 'cpu' ? ['You', 'CPU'] : ['Player 1', 'Player 2']
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    this.canvas.width = Math.floor(w * dpr)
    this.canvas.height = Math.floor(h * dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.layout = computeLayout(w, h)
    this.rebuildButtons()
    this.render()
  }

  private rebuildButtons(): void {
    const { width, height } = this.layout
    switch (this.screen) {
      case 'menu':
        this.buttons = centerButtons(width, height * 0.52, [
          { id: 'play', label: 'Play' },
          { id: 'collection', label: 'Collection / Deck' },
          { id: 'quit', label: 'Quit' }
        ])
        break
      case 'setup':
        this.setupLayout = buildSetupLayout(
          width,
          height,
          this.selectedRules,
          this.playerNames,
          this.firstPlayer,
          this.matchMode,
          this.aiDifficulty
        )
        this.buttons = this.setupLayout.actionButtons
        break
      case 'result':
        this.buttons = centerButtons(width, height * 0.72, [
          { id: 'rematch', label: 'Play Again' },
          { id: 'menu', label: 'Main Menu' }
        ])
        break
      case 'collection':
        this.collectionLayout = buildCollectionLayout(
          width,
          height,
          this.profile,
          this.collectionScroll
        )
        this.buttons = [
          {
            id: 'back',
            label: 'Back to Menu',
            rect: this.collectionLayout.backButton
          }
        ]
        break
      default:
        this.buttons = []
    }
  }

  private goToMenu(): void {
    this.clearCpuTimer()
    this.currentAnim = null
    this.animQueue = []
    this.inputLocked = false
    this.screen = 'menu'
    this.match = null
    this.result = null
    this.earnedCardId = null
    this.profile = loadProfile()
    this.rebuildButtons()
    this.render()
  }

  private goToCollection(): void {
    this.profile = loadProfile()
    this.collectionScroll = 0
    this.screen = 'collection'
    this.rebuildButtons()
    this.render()
  }

  private goToSetup(): void {
    this.screen = 'setup'
    this.firstPlayer = Math.random() < 0.5 ? 0 : 1
    this.selectedRules = cloneRules(DEFAULT_RULES)
    this.matchMode = 'local'
    this.aiDifficulty = 'normal'
    this.updatePlayerNames()
    this.rebuildButtons()
    this.render()
  }

  private startMatch(): void {
    this.profile = loadProfile()
    if (!this.selectedRules.random && !isDeckReady(this.profile)) return

    this.clearCpuTimer()
    this.currentAnim = null
    this.animQueue = []
    this.inputLocked = false
    this.earnedCardId = null

    const config: MatchConfig = {
      playerNames: this.playerNames,
      firstPlayer: this.firstPlayer,
      rules: cloneRules(this.selectedRules),
      cpuPlayer: this.matchMode === 'cpu' ? CPU_PLAYER : null,
      player0DeckIds: this.profile.selectedDeckIds
    }
    this.match = createMatch(config)
    this.result = null
    this.screen = 'match'
    this.buttons = []
    playMatchStart()
    this.render()
    this.scheduleCpuTurn()
  }

  private endMatch(): void {
    this.clearCpuTimer()
    this.currentAnim = null
    this.animQueue = []
    this.inputLocked = false
    if (!this.match) return
    this.result = finalizeMatch(this.match)
    this.earnedCardId = null

    if (
      this.match.cpuPlayer !== null &&
      this.result.winner === HUMAN_PLAYER
    ) {
      this.earnedCardId = earnCardFromOpponent(this.match.playedCardIds[CPU_PLAYER])
      recordMatchResult(this.result.winner, HUMAN_PLAYER)
    } else if (this.match.cpuPlayer !== null && this.result.winner !== null) {
      recordMatchResult(this.result.winner, HUMAN_PLAYER)
    } else if (this.result.winner !== null) {
      this.profile = loadProfile()
      this.profile.wins++
      saveProfile(this.profile)
    }

    this.profile = loadProfile()
    this.screen = 'result'
    this.rebuildButtons()
    this.render()
  }

  private isHumanTurn(): boolean {
    if (this.inputLocked || this.currentAnim) return false
    if (!this.match) return false
    if (this.match.cpuPlayer === null) return true
    return this.match.turn === HUMAN_PLAYER
  }

  private enqueuePlacementAnimations(
    event: PlaceEvent,
    fromX: number,
    fromY: number
  ): void {
    const { x: tx, y: ty } = this.boardCellCenter(event.boardIndex)
    this.animQueue.push(
      createPlaceAnim(event.card, event.player, fromX, fromY, tx, ty, event.boardIndex)
    )
    if (event.flippedBoardIndices.length > 0) {
      this.animQueue.push(createFlipAnim(event.flippedBoardIndices))
    }
    this.advanceAnimQueue()
  }

  private boardCellCenter(index: number): { x: number; y: number } {
    const col = index % 3
    const row = Math.floor(index / 3)
    const x = this.layout.boardRect.x + col * this.layout.cardSize + this.layout.cardSize / 2
    const y = this.layout.boardRect.y + row * this.layout.cardSize + this.layout.cardSize / 2
    return { x, y }
  }

  private advanceAnimQueue(): void {
    if (this.currentAnim && !isAnimDone(this.currentAnim)) return

    if (this.animQueue.length === 0) {
      this.currentAnim = null
      this.inputLocked = false
      if (this.match && isMatchOver(this.match)) {
        this.endMatch()
        return
      }
      this.scheduleCpuTurn()
      this.render()
      return
    }

    this.currentAnim = this.animQueue.shift()!
    this.inputLocked = true
    if (this.currentAnim.kind === 'flip') {
      if (this.match?.lastResolutionMessage) playSpecial()
      else playTurn()
    }
    this.render()
  }

  private afterPlacement(event: PlaceEvent, fromX: number, fromY: number): void {
    playCard()
    if (event.resolution.primary) playSpecial()

    const gameOver = isMatchOver(this.match!)
    if (!gameOver) advanceTurn(this.match!)
    this.enqueuePlacementAnimations(event, fromX, fromY)
  }

  private scheduleCpuTurn(): void {
    this.clearCpuTimer()
    if (!this.match || this.match.cpuPlayer === null) return
    if (this.inputLocked || this.currentAnim) return
    if (this.match.turn !== this.match.cpuPlayer) return
    if (isMatchOver(this.match)) return

    this.cpuTurnTimer = setTimeout(() => this.runCpuTurn(), CPU_THINK_MS)
  }

  private runCpuTurn(): void {
    this.cpuTurnTimer = null
    if (!this.match || this.match.cpuPlayer === null) return
    if (this.inputLocked || this.currentAnim) return
    const cpu = this.match.cpuPlayer
    if (this.match.turn !== cpu) return

    const move = chooseAiMove(this.match, cpu, this.aiDifficulty)
    if (!move) return

    const handLen = this.match.hands[cpu].length
    const from = handCardCenter(this.layout, cpu, move.handIndex, handLen, false)
    const event = placeCard(this.match, move.handIndex, move.boardIndex)
    if (event) {
      this.afterPlacement(event, from.x, from.y)
    } else {
      this.render()
      this.scheduleCpuTurn()
    }
  }

  private cycleMatchMode(): void {
    this.matchMode = this.matchMode === 'local' ? 'cpu' : 'local'
    this.updatePlayerNames()
    if (this.matchMode === 'cpu' && this.firstPlayer === CPU_PLAYER) {
      /* keep random first player */
    }
    this.rebuildButtons()
    this.render()
  }

  private cycleAiDifficulty(): void {
    const order: AiDifficulty[] = ['easy', 'normal', 'hard']
    const idx = order.indexOf(this.aiDifficulty)
    this.aiDifficulty = order[(idx + 1) % order.length]
    this.rebuildButtons()
    this.render()
  }

  private onMove(e: MouseEvent): void {
    const { x, y } = this.pointer(e)
    let changed = false

    let hit: string | null = null
    if (this.screen === 'setup') {
      hit = hitSetupAction(this.setupLayout, x, y)
    } else {
      hit = hitButton(this.buttons, x, y)
    }
    if (hit !== this.hoveredButton) {
      this.hoveredButton = hit
      changed = true
    }

    if (this.screen === 'setup') {
      const ruleHit = hitRuleToggle(this.setupLayout.toggles, x, y)
      const presetHit = hitPreset(this.setupLayout.presets, x, y)?.id ?? null
      const optionHit = hitSetupOption(this.setupLayout.options, x, y)
      if (
        ruleHit !== this.hoveredRuleKey ||
        presetHit !== this.hoveredPresetId ||
        optionHit !== this.hoveredOptionId
      ) {
        this.hoveredRuleKey = ruleHit
        this.hoveredPresetId = presetHit
        this.hoveredOptionId = optionHit
        changed = true
      }
    }

    if (this.screen === 'collection') {
      const cardHit = hitCollectionCell(this.collectionLayout, x, y)
      if (cardHit !== this.hoveredCollectionCard) {
        this.hoveredCollectionCard = cardHit
        changed = true
      }
    }

    if (changed) this.render()
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = this.pointer(e)

    if (this.screen === 'collection') {
      const { sfxButton } = this.collectionLayout
      if (
        x >= sfxButton.x &&
        x < sfxButton.x + sfxButton.w &&
        y >= sfxButton.y &&
        y < sfxButton.y + sfxButton.h
      ) {
        this.profile = toggleSfx(this.profile)
        setSoundMuted(!this.profile.sfxEnabled)
        this.render()
        return
      }
      const cardId = hitCollectionCell(this.collectionLayout, x, y)
      if (cardId !== null) {
        this.profile = toggleDeckCard(this.profile, cardId)
        this.collectionLayout = buildCollectionLayout(
          this.layout.width,
          this.layout.height,
          this.profile,
          this.collectionScroll
        )
        this.render()
        return
      }
      const btn = hitButton(this.buttons, x, y)
      if (btn) {
        this.handleButton(btn)
      }
      return
    }

    if (this.screen === 'setup') {
      const option = hitSetupOption(this.setupLayout.options, x, y)
      if (option === 'mode') {
        this.cycleMatchMode()
        return
      }
      if (option === 'difficulty') {
        this.cycleAiDifficulty()
        return
      }

      const ruleKey = hitRuleToggle(this.setupLayout.toggles, x, y)
      if (ruleKey) {
        this.selectedRules = applyToggle(this.selectedRules, ruleKey)
        this.rebuildButtons()
        this.render()
        return
      }
      const preset = hitPreset(this.setupLayout.presets, x, y)
      if (preset) {
        this.selectedRules = applyPreset(preset)
        this.rebuildButtons()
        this.render()
        return
      }
      const action = hitSetupAction(this.setupLayout, x, y)
      if (action) {
        this.handleButton(action)
        return
      }
    }

    const btn =
      this.screen === 'setup' ? hitSetupAction(this.setupLayout, x, y) : hitButton(this.buttons, x, y)
    if (btn) {
      this.handleButton(btn)
      return
    }

    if (this.screen === 'match' && this.match && this.isHumanTurn()) {
      this.handleMatchClick(x, y)
    }
  }

  private pointer(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private handleButton(id: string): void {
    switch (id) {
      case 'play':
        this.goToSetup()
        break
      case 'collection':
        this.goToCollection()
        break
      case 'quit':
        window.close()
        break
      case 'swap-first':
        this.firstPlayer = this.firstPlayer === 0 ? 1 : 0
        this.rebuildButtons()
        this.render()
        break
      case 'start':
        this.startMatch()
        break
      case 'back':
        this.goToMenu()
        break
      case 'rematch':
        this.startMatch()
        break
      case 'menu':
        this.goToMenu()
        break
    }
  }

  private handleMatchClick(x: number, y: number): void {
    if (!this.match || this.inputLocked || this.currentAnim) return
    const turn = this.match.turn

    const boardIdx = boardIndexAt(this.layout, x, y)
    if (boardIdx !== null) {
      const event = selectBoardCell(this.match, boardIdx)
      if (event) {
        const handLen = this.match.hands[turn].length + 1
        const from = handCardCenter(this.layout, turn, event.handIndex, handLen, false)
        this.afterPlacement(event, from.x, from.y)
      } else {
        if (this.match.selectedHandIndex !== null) playInvalid()
        this.render()
      }
      return
    }

    const handIdx = handIndexAt(this.layout, turn, this.match.hands[turn].length, x, y)
    if (handIdx !== null) {
      const wasSelected = this.match.selectedHandIndex === handIdx
      selectHandCard(this.match, handIdx)
      if (!wasSelected && this.match.selectedHandIndex === handIdx) playSelect()
      this.render()
    }
  }

  private render(): void {
    const ctx = this.ctx
    const { width, height } = this.layout
    drawMenuBackground(ctx, width, height)

    switch (this.screen) {
      case 'menu':
        this.renderMenu()
        break
      case 'setup':
        this.renderSetup()
        break
      case 'collection':
        this.renderCollection()
        break
      case 'match':
        this.renderMatch()
        break
      case 'result':
        this.renderResult()
        break
    }

    if (!this.assetsReady) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#fff'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Loading assets…', width / 2, height / 2)
    }
  }

  private renderMenu(): void {
    drawTitle(this.ctx, this.layout.width, this.layout.height * 0.32, 'Triple Triad')
    this.ctx.font = '18px Georgia, serif'
    this.ctx.fillStyle = '#a8b8d0'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('Final Fantasy VIII — Fan Clone', this.layout.width / 2, this.layout.height * 0.4)
    this.drawButtons()
  }

  private renderSetup(): void {
    const ctx = this.ctx
    const w = this.layout.width
    const narrow = w < 920
    const contentTop = this.setupLayout.toggles[0]?.rect.y ?? 150

    drawTitle(ctx, w, 48, 'Match Setup')
    drawSetupChrome(ctx, w, formatRules(this.selectedRules), narrow, contentTop)

    for (const o of this.setupLayout.options) {
      drawSetupOption(ctx, o, o.id === this.hoveredOptionId)
    }
    for (const t of this.setupLayout.toggles) {
      drawRuleToggle(ctx, t, t.key === this.hoveredRuleKey)
    }
    for (const p of this.setupLayout.presets) {
      drawPresetButton(ctx, p.name, p.rect, p.id === this.hoveredPresetId)
    }

    const infoY = this.setupLayout.playerInfoY
    ctx.textAlign = 'center'
    ctx.fillStyle = '#c8d0e0'
    ctx.font = '14px Georgia, serif'
    if (this.matchMode === 'cpu') {
      ctx.fillText(`You (blue, right) vs CPU (red, left) — AI: ${AI_DIFFICULTY_LABELS[this.aiDifficulty]}`, w / 2, infoY)
    } else {
      ctx.fillText(
        `Blue (right): ${this.playerNames[0]}  ·  Red (left): ${this.playerNames[1]}`,
        w / 2,
        infoY
      )
    }
    ctx.font = '13px Georgia, serif'
    ctx.fillStyle = '#98a8b8'
    this.profile = loadProfile()
    const deckLine = this.selectedRules.random
      ? 'Random rule — hand drawn from owned cards'
      : isDeckReady(this.profile)
        ? `Your deck: ${this.profile.selectedDeckIds.map((id) => getCardById(id)?.name ?? id).join(', ')}`
        : `Pick ${DECK_SIZE} cards in Collection / Deck (${this.profile.selectedDeckIds.length}/${DECK_SIZE})`
    ctx.fillText(deckLine, w / 2, infoY + 22)
    if (!this.selectedRules.random && !isDeckReady(this.profile)) {
      ctx.fillStyle = '#e8a060'
      ctx.fillText('Start disabled until your deck has 5 cards', w / 2, infoY + 42)
    }

    this.drawButtons()
  }

  private renderCollection(): void {
    const ctx = this.ctx
    const w = this.layout.width
    drawTitle(ctx, w, 48, 'Collection & Deck')
    ctx.textAlign = 'center'
    ctx.fillStyle = '#c8d0e0'
    ctx.font = '15px Georgia, serif'
    ctx.fillText(formatDeckStatus(this.profile), w / 2, 88)
    ctx.font = '13px Georgia, serif'
    ctx.fillStyle = '#98a8b8'
    ctx.fillText('Click owned cards to add or remove from your 5-card deck', w / 2, 106)

    const { sfxButton } = this.collectionLayout
    drawButton(ctx, {
      id: 'sfx',
      label: this.profile.sfxEnabled ? 'SFX: On' : 'SFX: Off',
      rect: sfxButton
    }, false)

    for (const cell of this.collectionLayout.cells) {
      drawCollectionCell(
        ctx,
        cell,
        getCardImage(cell.cardId),
        cell.cardId === this.hoveredCollectionCard
      )
    }

    this.drawButtons()
  }

  private renderMatch(): void {
    if (!this.match) return
    const hideBoardIndices: number[] = []
    if (this.currentAnim?.kind === 'place') {
      hideBoardIndices.push(this.currentAnim.boardIndex)
    }

    drawBoard(this.ctx, this.layout, this.match, { hideBoardIndices })
    drawHands(this.ctx, this.layout, this.match, this.playerNames)

    if (this.currentAnim?.kind === 'flip') {
      drawFlipOverlay(this.ctx, this.layout, this.currentAnim)
    }
    if (this.currentAnim?.kind === 'place') {
      drawFloatingCard(this.ctx, this.layout, this.currentAnim)
    }

    const p0 = handCardCount(this.match, 0)
    const p1 = handCardCount(this.match, 1)
    this.ctx.font = 'bold 20px Georgia, serif'
    this.ctx.fillStyle = '#f0e8c8'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(String(p1), this.layout.width / 2 - this.layout.cardSize * 2.5, 36)
    this.ctx.fillText(String(p0), this.layout.width / 2 + this.layout.cardSize * 2.5, 36)

    const cpuThinking =
      this.match.cpuPlayer !== null &&
      this.match.turn === this.match.cpuPlayer &&
      (this.cpuTurnTimer !== null || this.inputLocked)

    if (cpuThinking) {
      this.ctx.font = 'bold 16px Georgia, serif'
      this.ctx.fillStyle = '#ffe8a0'
      this.ctx.fillText('CPU is thinking…', this.layout.centerX, this.layout.height - 24)
    } else if (this.match.lastResolutionMessage) {
      this.ctx.font = 'bold 18px Georgia, serif'
      this.ctx.fillStyle = '#ffe8a0'
      this.ctx.fillText(this.match.lastResolutionMessage, this.layout.centerX, this.layout.height - 24)
      this.ctx.font = '14px Georgia, serif'
      this.ctx.fillStyle = '#c8d0e0'
      this.ctx.fillText(
        `${this.playerNames[this.match.turn]}'s turn`,
        this.layout.centerX,
        this.layout.height - 8
      )
    } else {
      this.ctx.font = '16px Georgia, serif'
      this.ctx.fillStyle = '#f0e8c8'
      this.ctx.fillText(
        `${this.playerNames[this.match.turn]}'s turn`,
        this.layout.centerX,
        this.layout.height - 24
      )
    }

    if (this.match.rules.suddenDeath) {
      this.ctx.font = '12px Georgia, serif'
      this.ctx.fillStyle = '#c8a060'
      this.ctx.fillText('Sudden Death — score includes cards in hand', this.layout.centerX, 20)
    }
  }

  private renderResult(): void {
    if (!this.result || !this.match) return
    drawTitle(this.ctx, this.layout.width, 72, 'Game Over')
    const ctx = this.ctx
    const scoreLabel = this.match.rules.suddenDeath ? 'Total (board + hand)' : 'Board'
    ctx.textAlign = 'center'
    ctx.font = '22px Georgia, serif'
    if (this.result.winner === null) {
      ctx.fillStyle = '#e0e0e0'
      ctx.fillText('Draw!', this.layout.width / 2, 120)
    } else {
      ctx.fillStyle = this.result.winner === 0 ? '#8ab0ff' : '#ff8a8a'
      ctx.fillText(`${this.playerNames[this.result.winner]} wins!`, this.layout.width / 2, 120)
    }
    ctx.fillStyle = '#d0d8e8'
    ctx.font = '18px Georgia, serif'
    ctx.fillText(
      `${scoreLabel} — ${this.playerNames[1]}: ${this.result.scores[1]}  |  ${this.playerNames[0]}: ${this.result.scores[0]}`,
      this.layout.width / 2,
      155
    )

    if (this.earnedCardId !== null) {
      const card = getCardById(this.earnedCardId)
      ctx.fillStyle = '#b8e8b8'
      ctx.font = 'bold 18px Georgia, serif'
      ctx.fillText(
        `You earned: ${card?.name ?? `Card #${this.earnedCardId}`}`,
        this.layout.width / 2,
        185
      )
    }

    const scale = 0.55
    const smallLayout = {
      ...this.layout,
      cardSize: Math.floor(this.layout.cardSize * scale),
      boardRect: {
        x: this.layout.centerX - (this.layout.cardSize * scale * 3) / 2,
        y: 200,
        w: this.layout.cardSize * scale * 3,
        h: this.layout.cardSize * scale * 3
      },
      centerX: this.layout.centerX,
      centerY: 200 + (this.layout.cardSize * scale * 3) / 2
    }
    drawBoard(ctx, smallLayout, this.match)

    this.drawButtons()
  }

  private drawButtons(): void {
    for (const b of this.buttons) {
      drawButton(this.ctx, b, b.id === this.hoveredButton)
    }
  }
}
