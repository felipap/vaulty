import { readFileSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export type Sticky = {
  id: string
  text: string
}

const STICKIES_DIR = join(
  homedir(),
  'Library/Containers/com.apple.Stickies/Data/Library/Stickies',
)

function getStickiesDir(): string | null {
  try {
    const entries = readdirSync(STICKIES_DIR)
    if (entries.length === 0) {
      return null
    }
    return STICKIES_DIR
  } catch {
    return null
  }
}

function rtfToPlainText(rtf: string): string {
  let out = rtf
  // Remove RTF control groups {\*?\...[^{}]*} and bare {}
  out = out.replace(/\{\\[^{}]*\}/g, '')
  out = out.replace(/[{}]/g, '')
  // Remove \controlword and \controlwordN (optional numeric arg)
  out = out.replace(/\\[a-z]+\d*\s?/gi, ' ')
  // Decode \'XX (hex byte in current codepage) — treat as Latin-1 for simplicity
  out = out.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })
  return out.replace(/\s+/g, ' ').trim()
}

export function fetchStickies(): Sticky[] {
  const dir = getStickiesDir()
  if (!dir) {
    return []
  }

  const entries = readdirSync(dir, { withFileTypes: true })
  const stickies: Sticky[] = []

  for (const ent of entries) {
    if (!ent.isDirectory() || !ent.name.endsWith('.rtfd')) {
      continue
    }
    const id = ent.name.replace(/\.rtfd$/, '')
    const rtfPath = join(dir, ent.name, 'TXT.rtf')
    try {
      const rtf = readFileSync(rtfPath, 'utf-8')
      const text = rtfToPlainText(rtf)
      stickies.push({ id, text })
    } catch {
      stickies.push({ id, text: '' })
    }
  }

  return stickies
}
