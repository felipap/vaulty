// Animation frames are stored inside assets/tray-animations/{animationName}.
// They are named frame-*.png.

import { setTrayIcon } from './index'

const ANIMATION_NAMES = ['default', 'old'] as const
export type AnimationName = (typeof ANIMATION_NAMES)[number]

const FRAME_COUNTS: Record<AnimationName, number> = {
  default: 20,
  old: 19,
}

const FPS = 30
const FRAME_INTERVAL = 1000 / FPS

let animationInterval: NodeJS.Timeout | null = null
let currentFrame = 1

export function startAnimating(animationName: AnimationName) {
  if (!ANIMATION_NAMES.includes(animationName)) {
    throw new Error(`Invalid animation: ${animationName}`)
  }

  stopAnimating()

  const frameCount = FRAME_COUNTS[animationName]
  currentFrame = 1

  animationInterval = setInterval(() => {
    setTrayIcon(`tray-animations/${animationName}/frame-${currentFrame}.png`)
    currentFrame = (currentFrame % frameCount) + 1
  }, FRAME_INTERVAL)
}

export function stopAnimating() {
  if (animationInterval) {
    clearInterval(animationInterval)
    animationInterval = null
  }
  setTrayIcon('tray-default.png')
}
