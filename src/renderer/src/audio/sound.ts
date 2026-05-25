let muted = false
let initialized = false
const buffers = new Map<string, AudioBuffer>()

const SOUND_FILES: Record<string, string> = {
  select: 'select.wav',
  card: 'card.wav',
  turn: 'turn.wav',
  special: 'special.wav',
  invalid: 'invalid.wav',
  start: 'start.wav'
}

async function loadBuffer(ctx: AudioContext, name: string, file: string): Promise<void> {
  try {
    const url = new URL(`../assets/sounds/${file}`, import.meta.url).href
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.arrayBuffer()
    buffers.set(name, await ctx.decodeAudioData(data))
  } catch {
    /* optional assets */
  }
}

export async function initSound(enabled: boolean): Promise<void> {
  muted = !enabled
  if (initialized) return
  try {
    const ctx = new AudioContext()
    await Promise.all(
      Object.entries(SOUND_FILES).map(([name, file]) => loadBuffer(ctx, name, file))
    )
    ;(window as unknown as { __ttAudio?: AudioContext }).__ttAudio = ctx
    initialized = true
  } catch {
    initialized = true
  }
}

export function setSoundMuted(m: boolean): void {
  muted = m
}

function playTone(freq: number, duration: number, volume = 0.08): void {
  if (muted) return
  try {
    const ctx = (window as unknown as { __ttAudio?: AudioContext }).__ttAudio ?? new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.value = volume
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    /* ignore */
  }
}

function playBuffer(name: string): void {
  if (muted) return
  const buf = buffers.get(name)
  const ctx = (window as unknown as { __ttAudio?: AudioContext }).__ttAudio
  if (!buf || !ctx) return
  try {
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = 0.35
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
  } catch {
    /* ignore */
  }
}

export function playSelect(): void {
  if (buffers.has('select')) playBuffer('select')
  else playTone(520, 0.05)
}

export function playCard(): void {
  if (buffers.has('card')) playBuffer('card')
  else playTone(380, 0.06)
}

export function playTurn(): void {
  if (buffers.has('turn')) playBuffer('turn')
  else playTone(280, 0.08)
}

export function playSpecial(): void {
  if (buffers.has('special')) playBuffer('special')
  else playTone(660, 0.12)
}

export function playInvalid(): void {
  if (buffers.has('invalid')) playBuffer('invalid')
  else playTone(180, 0.1)
}

export function playMatchStart(): void {
  if (buffers.has('start')) playBuffer('start')
  else playTone(440, 0.15)
}
