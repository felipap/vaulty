import Database from 'better-sqlite3'
import { existsSync } from 'fs'
import { gunzipSync } from 'zlib'
import { homedir } from 'os'
import { join } from 'path'

export type AppleNote = {
  id: number
  title: string
  body: string
  folderName: string | null
  accountName: string | null
  isPinned: boolean
  createdAt: string
  modifiedAt: string
}

// Core Data epoch: seconds since Jan 1, 2001
const CORE_DATA_EPOCH_OFFSET = 978307200

export function coreDataTimestampToISO(ts: number | null): string {
  if (ts === null || ts === undefined) {
    return new Date(0).toISOString()
  }
  return new Date((ts + CORE_DATA_EPOCH_OFFSET) * 1000).toISOString()
}

function getNotesDbPath(): string {
  return join(
    homedir(),
    'Library/Group Containers/group.com.apple.notes/NoteStore.sqlite',
  )
}

export function isAppleNotesAvailable(): boolean {
  return existsSync(getNotesDbPath())
}

export function extractTextFromProtobuf(data: Buffer): string {
  // Apple Notes stores body content as gzipped protobuf with nested messages.
  // Text is embedded as length-delimited strings deep in the structure, so we
  // recursively walk the wire format to find all readable strings.
  const strings: string[] = []

  function walk(buf: Buffer, end: number, pos: number): void {
    while (pos < end) {
      const tag = buf[pos]
      const wireType = tag & 0x07
      pos++

      if (wireType === 0) {
        while (pos < end && buf[pos] & 0x80) {
          pos++
        }
        pos++
      } else if (wireType === 2) {
        let length = 0
        let shift = 0
        while (pos < end && buf[pos] & 0x80) {
          length |= (buf[pos] & 0x7f) << shift
          shift += 7
          pos++
        }
        if (pos < end) {
          length |= (buf[pos] & 0x7f) << shift
          pos++
        }

        if (length <= 0 || length > 1_000_000 || pos + length > end) {
          break
        }

        const slice = buf.subarray(pos, pos + length)
        const str = slice.toString('utf-8')
        // Check if it decodes as valid UTF-8 text (no replacement characters)
        // and contains mostly printable characters
        const hasReplacementChars = str.includes('\ufffd')
        const printableRatio =
          str.split('').filter((c) => {
            const code = c.charCodeAt(0)
            return (
              (code >= 0x20 && code <= 0x7e) || // printable ASCII
              code === 0x0a || // newline
              code === 0x0d || // carriage return
              code === 0x09 || // tab
              code > 0x7f // valid UTF-8 multi-byte (already decoded)
            )
          }).length / str.length

        const isText = !hasReplacementChars && printableRatio > 0.8 && length > 1

        if (isText) {
          if (str.trim().length > 0) {
            strings.push(str)
          }
        } else if (length > 2) {
          // Recurse into non-text blobs to find nested text
          walk(buf, pos + length, pos)
        }
        pos += length
      } else if (wireType === 5) {
        pos += 4
      } else if (wireType === 1) {
        pos += 8
      } else {
        break
      }
    }
  }

  walk(data, data.length, 0)
  return strings.join('\n')
}

export function decompressNoteBody(data: Buffer | null): string {
  if (!data || data.length === 0) {
    return ''
  }

  let decompressed: Buffer
  try {
    decompressed = gunzipSync(data)
  } catch {
    // Not gzipped, try as raw text
    return data.toString('utf-8')
  }

  return extractTextFromProtobuf(decompressed)
}

type RawNote = {
  id: number
  title: string | null
  bodyData: Buffer | null
  folderName: string | null
  accountName: string | null
  isPinned: number | null
  createdAt: number | null
  modifiedAt: number | null
}

const NOTES_QUERY = `
  SELECT
    n.Z_PK as id,
    n.ZTITLE1 as title,
    nd.ZDATA as bodyData,
    folder.ZTITLE2 as folderName,
    account.ZNAME as accountName,
    n.ZISPINNED as isPinned,
    n.ZCREATIONDATE1 as createdAt,
    n.ZMODIFICATIONDATE1 as modifiedAt
  FROM ZICCLOUDSYNCINGOBJECT n
  LEFT JOIN ZICNOTEDATA nd ON nd.ZNOTE = n.Z_PK
  LEFT JOIN ZICCLOUDSYNCINGOBJECT folder ON folder.Z_PK = n.ZFOLDER
  LEFT JOIN ZICCLOUDSYNCINGOBJECT account ON account.Z_PK = n.ZACCOUNT4
  WHERE n.ZTITLE1 IS NOT NULL
    AND (n.ZMARKEDFORDELETION IS NULL OR n.ZMARKEDFORDELETION = 0)
  ORDER BY n.ZMODIFICATIONDATE1 DESC
`

export function fetchNotes(): AppleNote[] {
  const dbPath = getNotesDbPath()
  if (!existsSync(dbPath)) {
    return []
  }

  const db = new Database(dbPath, { readonly: true })

  let rows: RawNote[]
  try {
    rows = db.prepare(NOTES_QUERY).all() as RawNote[]
  } finally {
    db.close()
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title ?? '',
    body: decompressNoteBody(row.bodyData),
    folderName: row.folderName ?? null,
    accountName: row.accountName ?? null,
    isPinned: row.isPinned === 1,
    createdAt: coreDataTimestampToISO(row.createdAt),
    modifiedAt: coreDataTimestampToISO(row.modifiedAt),
  }))
}
