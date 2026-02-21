// Run locally from desktop/: npm run test -- backend/sources/stickies/index.test.ts
// Or: npx electron node_modules/vitest/vitest.mjs run backend/sources/stickies/index.test.ts

import { describe, expect, it } from 'vitest'
import { fetchStickies } from './index'

describe('stickies', () => {
  it('returns an array of stickies with id and text', () => {
    const stickies = fetchStickies()

    expect(Array.isArray(stickies)).toBe(true)
    for (const s of stickies) {
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('text')
      expect(typeof s.id).toBe('string')
      expect(typeof s.text).toBe('string')
    }

    if (stickies.length > 0) {
      console.log(`Fetched ${stickies.length} stickies`)
      console.log('Sample:', {
        id: stickies[0].id,
        text: stickies[0].text.slice(0, 80) + (stickies[0].text.length > 80 ? '…' : ''),
      })
    }
  })
})
