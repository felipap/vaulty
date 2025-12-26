// Animation frames are stored inside assets/tray-animations/{animationName}.
// They are named frame-*.png.

import { setTrayIcon } from './index'

const ANIMATION_NAMES = ['old'] as const
export type AnimationName = (typeof ANIMATION_NAMES)[number]

const FRAME_COUNTS: Record<AnimationName, number> = {
  old: 19,
}

const FPS = 30
const FRAME_INTERVAL = 1000 / FPS

//
//
//
//

let shouldStop = false
let animationInterval: NodeJS.Timeout | null = null

async function animateOnce(animationName: AnimationName): Promise<void> {
  if (animationInterval) {
    // console.warn('Animation already in progress')
    return
  }

  const frameCount = FRAME_COUNTS[animationName]
  // Forward: 1, 2, ..., frameCount, then backward: frameCount-1, ..., 2
  // Total frames: frameCount + (frameCount - 2) = 2*frameCount - 2
  const frames: number[] = []
  for (let i = 1; i <= frameCount; i++) {
    frames.push(i)
  }
  for (let i = frameCount - 1; i >= 2; i--) {
    frames.push(i)
  }

  let frameIndex = 0

  await new Promise<void>((resolve) => {
    animationInterval = setInterval(async () => {
      setTrayIcon(
        `tray-animations/${animationName}/frame-${frames[frameIndex]}.png`,
      )
      frameIndex++

      if (frameIndex >= frames.length && animationInterval) {
        clearInterval(animationInterval)
        animationInterval = null
        resolve()
        return
      }
    }, FRAME_INTERVAL)
  })

  await sleep(1000)

  setTrayIcon('tray-default.png')
}

export function startAnimating(animationName: AnimationName): () => void {
  if (!ANIMATION_NAMES.includes(animationName)) {
    throw new Error(`Invalid animation: ${animationName}`)
  }

  shouldStop = false

  // Run animation loop in background (non-blocking)
  const runLoop = async () => {
    while (!shouldStop) {
      await animateOnce(animationName)
      await sleep(1000)
    }
    setTrayIcon('tray-default.png')
  }
  runLoop()

  return () => {
    stopAnimating()
  }
}

export function stopAnimating() {
  shouldStop = true
}

export function stopAnimatingImmediately() {
  shouldStop = true
  if (animationInterval) {
    clearInterval(animationInterval)
    animationInterval = null
  }
  setTrayIcon('tray-default.png')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
