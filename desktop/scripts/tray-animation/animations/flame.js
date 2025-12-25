// Flame Animation
// A flickering flame with organic movement

export const name = 'Flame'

export const modes = ['flicker', 'sway', 'pulse', 'wild']

export const defaults = {
  frameCount: 20,
  intensity: 0.6,
  fps: 14,
}

// Draw the flame shape
export function draw(ctx, x, y, size, deform = {}) {
  const {
    scaleX = 1,
    scaleY = 1,
    sway = 0,
    tipOffset = 0,
    innerScale = 1,
  } = deform

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scaleX, scaleY)

  // Outer flame
  drawFlameShape(ctx, 0, 0, size, sway, tipOffset, 'white')

  // Inner flame (slightly smaller, offset up)
  const innerSize = size * 0.5 * innerScale
  ctx.globalCompositeOperation = 'destination-out'
  drawFlameShape(ctx, 0, size * 0.15, innerSize, sway * 0.6, tipOffset * 0.5, 'white')

  ctx.restore()
}

function drawFlameShape(ctx, x, y, size, sway, tipOffset, color) {
  ctx.beginPath()

  const baseWidth = size * 0.35
  const height = size * 0.9

  // Flame base (bottom center)
  const baseY = height * 0.35
  const tipY = -height * 0.55 + tipOffset

  // Start from bottom left
  ctx.moveTo(x - baseWidth * 0.3, y + baseY)

  // Left side curves up with organic waviness
  ctx.bezierCurveTo(
    x - baseWidth + sway * 0.3,
    y + baseY * 0.3,
    x - baseWidth * 0.8 + sway * 0.5,
    y - height * 0.1,
    x - baseWidth * 0.4 + sway * 0.8,
    y - height * 0.35,
  )

  // Left side to tip
  ctx.bezierCurveTo(
    x - baseWidth * 0.2 + sway,
    y - height * 0.5,
    x + sway * 1.2,
    y + tipY + height * 0.1,
    x + sway * 1.5,
    y + tipY,
  )

  // Tip to right side
  ctx.bezierCurveTo(
    x + sway * 1.2,
    y + tipY + height * 0.1,
    x + baseWidth * 0.2 + sway,
    y - height * 0.5,
    x + baseWidth * 0.4 + sway * 0.8,
    y - height * 0.35,
  )

  // Right side curves down
  ctx.bezierCurveTo(
    x + baseWidth * 0.8 + sway * 0.5,
    y - height * 0.1,
    x + baseWidth + sway * 0.3,
    y + baseY * 0.3,
    x + baseWidth * 0.3,
    y + baseY,
  )

  // Close the bottom
  ctx.bezierCurveTo(
    x + baseWidth * 0.15,
    y + baseY + 2,
    x - baseWidth * 0.15,
    y + baseY + 2,
    x - baseWidth * 0.3,
    y + baseY,
  )

  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

// Get deformation parameters for a specific frame
export function getDeformForFrame(frame, totalFrames, mode, intensity) {
  const t = frame / totalFrames
  const cycle = Math.sin(t * Math.PI * 2)
  const cycle2 = Math.cos(t * Math.PI * 2)
  const cycle3 = Math.sin(t * Math.PI * 4) // Double frequency for flicker

  switch (mode) {
    case 'flicker':
      // Quick, subtle flickering
      return {
        scaleX: 1 + cycle3 * 0.05 * intensity,
        scaleY: 1 + cycle * 0.08 * intensity,
        sway: cycle2 * 1.5 * intensity,
        tipOffset: cycle3 * 2 * intensity,
        innerScale: 1 + cycle3 * 0.15 * intensity,
      }

    case 'sway':
      // Gentle side-to-side movement
      return {
        scaleX: 1,
        scaleY: 1 + cycle * 0.05 * intensity,
        sway: cycle * 3 * intensity,
        tipOffset: Math.abs(cycle) * 1.5 * intensity,
        innerScale: 1 + cycle2 * 0.1 * intensity,
      }

    case 'pulse':
      // Breathing flame
      return {
        scaleX: 1 + cycle * 0.1 * intensity,
        scaleY: 1 + cycle * 0.12 * intensity,
        sway: cycle2 * 1 * intensity,
        tipOffset: -cycle * 2 * intensity,
        innerScale: 1 + cycle * 0.2 * intensity,
      }

    case 'wild':
      // Erratic, windblown flame
      const noise1 = Math.sin(t * Math.PI * 6)
      const noise2 = Math.cos(t * Math.PI * 5)
      return {
        scaleX: 1 + noise1 * 0.08 * intensity,
        scaleY: 1 + cycle * 0.1 * intensity,
        sway: (cycle * 2 + noise2 * 1.5) * intensity,
        tipOffset: (noise1 * 2 + cycle2) * intensity,
        innerScale: 1 + noise1 * 0.2 * intensity,
      }

    default:
      return {}
  }
}




