import cardUrl from '../../assets/sounds/card.wav?url'
import invalidUrl from '../../assets/sounds/invalid.wav?url'
import selectUrl from '../../assets/sounds/select.wav?url'
import specialUrl from '../../assets/sounds/special.wav?url'
import startUrl from '../../assets/sounds/start.wav?url'
import turnUrl from '../../assets/sounds/turn.wav?url'

const SOUND_URLS = {
  select: selectUrl,
  card: cardUrl,
  turn: turnUrl,
  special: specialUrl,
  invalid: invalidUrl,
  start: startUrl
} as const

type SoundName = keyof typeof SOUND_URLS

let muted = false
let loadPromise: Promise<void> | null = null
const clips = new Map<SoundName, HTMLAudioElement>()

function loadClip(name: SoundName, url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio()
    audio.preload = 'auto'
    const finish = (): void => resolve()
    audio.addEventListener(
      'canplaythrough',
      () => {
        clips.set(name, audio)
        finish()
      },
      { once: true }
    )
    audio.addEventListener('error', finish, { once: true })
    audio.src = url
  })
}

async function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all(
      (Object.entries(SOUND_URLS) as [SoundName, string][]).map(([name, url]) =>
        loadClip(name, url)
      )
    ).then(() => undefined)
  }
  return loadPromise
}

/** Call on first user click so playback is allowed in Electron. */
export async function unlockSound(): Promise<void> {
  await ensureLoaded()
}

export function hasSoundFile(name: SoundName): boolean {
  return clips.has(name)
}

export async function initSound(enabled: boolean): Promise<void> {
  muted = !enabled
  await ensureLoaded()
}

export function setSoundMuted(m: boolean): void {
  muted = m
}

function playTone(freq: number, duration: number, volume = 0.08): void {
  if (muted) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.value = volume
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
    void ctx.close()
  } catch {
    /* ignore */
  }
}

function playClip(name: SoundName): void {
  if (muted) return
  const template = clips.get(name)
  if (!template) {
    playTone(440, 0.08)
    return
  }
  const audio = template.cloneNode(true) as HTMLAudioElement
  audio.volume = 0.45
  void audio.play().catch(() => playTone(440, 0.08))
}

export function playSelect(): void {
  if (clips.has('select')) playClip('select')
  else playTone(520, 0.05)
}

export function playCard(): void {
  if (clips.has('card')) playClip('card')
  else playTone(380, 0.06)
}

export function playTurn(): void {
  if (clips.has('turn')) playClip('turn')
  else playTone(280, 0.08)
}

export function playSpecial(): void {
  if (clips.has('special')) playClip('special')
  else playTone(660, 0.12)
}

export function playInvalid(): void {
  if (clips.has('invalid')) playClip('invalid')
  else playTone(180, 0.1)
}

export function playMatchStart(): void {
  if (clips.has('start')) playClip('start')
  else playTone(440, 0.15)
}
