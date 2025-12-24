import fs from 'fs'
import path from 'path'
import os from 'os'

const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads')
// Resolve assets directory relative to script location
// Script is at: desktop/scripts/tray-animation/import-tray-icons.ts
// Assets should be at: desktop/assets/
const ASSETS_DIR = path.resolve(__dirname, '../../assets')

const ANIMATION = 'default'

function findFrameFiles(): string[] {
  const files = fs.readdirSync(DOWNLOADS_DIR)
  return files
    .filter((f) => /^frame-\d+\.png$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0')
      const numB = parseInt(b.match(/\d+/)?.[0] || '0')
      return numA - numB
    })
}

function copyFramesToAssets(frameFiles: string[]): void {
  console.log(`Found ${frameFiles.length} frame files in Downloads`)

  if (frameFiles.length === 0) {
    console.log('No frame-*.png files found in Downloads folder')
    console.log(
      'Generate them using: desktop/scripts/tray-animation/generate-icon-animation.html',
    )
    process.exit(1)
  }

  // Create tray-frames directory if it doesn't exist
  const framesDir = path.join(ASSETS_DIR, `tray-animations/${ANIMATION}`)
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true })
    console.log(`Created directory: ${framesDir}`)
  }

  // Clear existing frames
  const existingFrames = fs
    .readdirSync(framesDir)
    .filter((f) => f.endsWith('.png'))
  for (const file of existingFrames) {
    fs.unlinkSync(path.join(framesDir, file))
  }
  if (existingFrames.length > 0) {
    console.log(`Cleared ${existingFrames.length} existing frames`)
  }

  // Copy new frames
  for (const file of frameFiles) {
    const src = path.join(DOWNLOADS_DIR, file)
    const dest = path.join(framesDir, file)
    fs.copyFileSync(src, dest)
    console.log(`  Copied: ${file}`)
  }

  console.log(`\n✓ Imported ${frameFiles.length} frames to ${framesDir}`)
}

function cleanupDownloads(frameFiles: string[]): void {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question(
    '\nDelete frame files from Downloads? (y/N) ',
    (answer: string) => {
      rl.close()
      if (answer.toLowerCase() === 'y') {
        for (const file of frameFiles) {
          fs.unlinkSync(path.join(DOWNLOADS_DIR, file))
        }
        console.log(`Deleted ${frameFiles.length} files from Downloads`)
      }
    },
  )
}

// Main
const frameFiles = findFrameFiles()
copyFramesToAssets(frameFiles)

if (process.argv.includes('--cleanup')) {
  cleanupDownloads(frameFiles)
} else if (frameFiles.length > 0) {
  console.log('\nTip: Run with --cleanup to delete source files from Downloads')
}
