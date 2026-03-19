import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/apple-notes/[noteId]/route"
import { NextRequest } from "next/server"

const mockNote = {
  id: 1,
  noteId: 123,
  title: "encrypted:abc123",
  body: "encrypted:body456",
  folderName: "Notes",
  accountName: "iCloud",
  isPinned: false,
  noteCreatedAt: "2024-01-01T00:00:00Z",
  noteModifiedAt: "2024-01-02T00:00:00Z",
  deviceId: "test-device",
  syncTime: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockFindFirst = vi.fn()

vi.mock("@/db", () => ({
  db: {
    query: {
      AppleNotes: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  requireReadAuth: vi.fn().mockResolvedValue({
    authorized: true,
    token: { id: "test-token" },
  }),
}))

vi.mock("@/lib/activity-log", () => ({
  logRead: vi.fn().mockResolvedValue(undefined),
}))

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"))
}

describe("GET /api/apple-notes/[noteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for invalid noteId", async () => {
    const response = await GET(
      createRequest("/api/apple-notes/abc"),
      { params: Promise.resolve({ noteId: "abc" }) }
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Invalid noteId")
  })

  it("returns 404 when note not found", async () => {
    mockFindFirst.mockResolvedValue(null)

    const response = await GET(
      createRequest("/api/apple-notes/999"),
      { params: Promise.resolve({ noteId: "999" }) }
    )

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe("Note not found")
    expect(json.success).toBeUndefined()
  })

  it("returns note when found", async () => {
    mockFindFirst.mockResolvedValue(mockNote)

    const response = await GET(
      createRequest("/api/apple-notes/123"),
      { params: Promise.resolve({ noteId: "123" }) }
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.note).toEqual(expect.objectContaining({
      noteId: 123,
      title: "encrypted:abc123",
      body: "encrypted:body456",
    }))
  })

  it("queries with correct noteId", async () => {
    mockFindFirst.mockResolvedValue(mockNote)

    await GET(
      createRequest("/api/apple-notes/456"),
      { params: Promise.resolve({ noteId: "456" }) }
    )

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
      })
    )
  })
})
