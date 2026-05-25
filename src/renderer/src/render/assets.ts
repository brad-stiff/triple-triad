const cardImageCache = new Map<number, HTMLImageElement>()
let boardImage: HTMLImageElement | null = null
let frameBlue: HTMLImageElement | null = null
let frameRed: HTMLImageElement | null = null
let loadPromise: Promise<void> | null = null

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}

function cardPath(id: number): string {
  return new URL(`../../assets/cards/${String(id).padStart(3, '0')}.png`, import.meta.url).href
}

export function hasCardArt(id: number): boolean {
  const img = cardImageCache.get(id)
  return Boolean(img && img.complete && img.naturalWidth > 0)
}

export async function loadGameAssets(cardIds: number[]): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const base = new URL('../../assets/', import.meta.url).href
    const optional = async (path: string): Promise<HTMLImageElement | null> => {
      try {
        return await loadImage(`${base}${path}`)
      } catch {
        return null
      }
    }

    boardImage = await optional('board.png')
    frameBlue = await optional('frame-blue.png')
    frameRed = await optional('frame-red.png')

    await Promise.all(
      cardIds.map(async (id) => {
        try {
          const img = await loadImage(cardPath(id))
          cardImageCache.set(id, img)
        } catch {
          /* fallback drawing */
        }
      })
    )
  })()

  return loadPromise
}

export function getCardImage(id: number): HTMLImageElement | undefined {
  return cardImageCache.get(id)
}

export function getBoardImage(): HTMLImageElement | null {
  return boardImage
}

export function getFrameImage(owner: 0 | 1): HTMLImageElement | null {
  return owner === 0 ? frameBlue : frameRed
}
