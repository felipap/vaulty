// Droplet Animation
// A teardrop shape with various animation modes

export const name = 'Droplet'

export const modes = ['pulse', 'wobble', 'drip', 'bounce']

export const defaults = {
  frameCount: 20,
  intensity: 0.5,
  fps: 12,
}

// Draw the droplet shape
export function draw(ctx, x, y, size, deform = {}) {
  const { scaleX = 1, scaleY = 1, wobble = 0, offsetY = 0 } = deform

  ctx.save()
  ctx.translate(x, y + offsetY)
  ctx.scale(scaleX, scaleY)

  // Droplet path - tear drop shape
  ctx.beginPath()

  const r = size * 0.4 // Main body radius
  const tipY = -size * 0.45 // Tip of droplet

  // Start at the tip
  ctx.moveTo(wobble * 2, tipY)

  // Right curve down to body
  ctx.bezierCurveTo(
    r * 0.3 + wobble,
    tipY + size * 0.2,
    r + wobble * 0.5,
    -r * 0.3,
    r,
    r * 0.2,
  )

  // Bottom curve (the round part)
  ctx.bezierCurveTo(r, r * 0.8, r * 0.5, r, 0, r)
  ctx.bezierCurveTo(-r * 0.5, r, -r, r * 0.8, -r, r * 0.2)

  // Left curve back up to tip
  ctx.bezierCurveTo(
    -r - wobble * 0.5,
    -r * 0.3,
    -r * 0.3 - wobble,
    tipY + size * 0.2,
    wobble * 2,
    tipY,
  )

  ctx.closePath()
  ctx.fillStyle = 'white'
  ctx.fill()

  ctx.restore()
}

// Get deformation parameters for a specific frame
export function getDeformForFrame(frame, totalFrames, mode, intensity) {
  const t = frame / totalFrames
  const cycle = Math.sin(t * Math.PI * 2)
  const cycle2 = Math.cos(t * Math.PI * 2)

  switch (mode) {
    case 'pulse':
      return {
        scaleX: 1 + cycle * 0.1 * intensity,
        scaleY: 1 + cycle * 0.1 * intensity,
      }

    case 'wobble':
      return {
        scaleX: 1 + cycle * 0.08 * intensity,
        scaleY: 1 - cycle * 0.08 * intensity,
        wobble: cycle2 * 2 * intensity,
      }

    case 'drip':
      // Elongate and squish in a dripping motion
      const dripPhase = (t * 2) % 1
      const squish = Math.sin(dripPhase * Math.PI)
      return {
        scaleX: 1 - squish * 0.15 * intensity,
        scaleY: 1 + squish * 0.2 * intensity,
        offsetY: squish * 2 * intensity,
      }

    case 'bounce':
      // Bouncing with squash and stretch
      const bounceT = Math.abs(Math.sin(t * Math.PI))
      const squash = bounceT
      return {
        scaleX: 1 + squash * 0.12 * intensity,
        scaleY: 1 - squash * 0.1 * intensity,
        offsetY: -bounceT * 3 * intensity,
      }

    default:
      return {}
  }
}

