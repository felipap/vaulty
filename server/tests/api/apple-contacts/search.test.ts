import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/apple-contacts/search/route"
import { NextRequest } from "next/server"

const mockContacts = [
  {
    id: "1",
    contactId: "c1",
    firstName: "John",
    lastName: "Doe",
    organization: "Acme Inc",
    emails: JSON.stringify(["john@example.com"]),
    phoneNumbers: JSON.stringify(["+1234567890"]),
    syncTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    contactId: "c2",
    firstName: "Jane",
    lastName: "Smith",
    organization: "Tech Corp",
    emails: JSON.stringify(["jane@example.com"]),
    phoneNumbers: JSON.stringify(["+0987654321"]),
    syncTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    contactId: "c3",
    firstName: "Johnny",
    lastName: "Appleseed",
    organization: null,
    emails: JSON.stringify([]),
    phoneNumbers: JSON.stringify(["+1111111111"]),
    syncTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockFindMany = vi.fn()

vi.mock("@/db", () => ({
  db: {
    query: {
      AppleContacts: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  requireReadAuth: vi.fn().mockResolvedValue({
    authorized: true,
    token: { id: "test-token" },
  }),
  getDataWindowCutoff: vi.fn().mockReturnValue(null),
}))

vi.mock("@/lib/activity-log", () => ({
  logRead: vi.fn().mockResolvedValue(undefined),
}))

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"))
}

describe("GET /api/apple-contacts/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue(mockContacts)
  })

  it("returns 400 when no index parameter is provided", async () => {
    const response = await GET(createRequest("/api/apple-contacts/search"))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("firstNameIndex")
  })

  it("returns 400 for unknown parameters", async () => {
    const response = await GET(
      createRequest("/api/apple-contacts/search?firstNameIndex=abc&bogus=1")
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.type).toBe("invalid_request_error")
    expect(json.error.message).toContain("bogus")
  })

  it("returns 400 for invalid limit", async () => {
    const response = await GET(
      createRequest("/api/apple-contacts/search?firstNameIndex=abc&limit=notanumber")
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.type).toBe("invalid_request_error")
    expect(json.error.param).toBe("limit")
  })

  it("returns 400 when limit exceeds 100", async () => {
    const response = await GET(
      createRequest("/api/apple-contacts/search?firstNameIndex=abc&limit=500")
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error.type).toBe("invalid_request_error")
    expect(json.error.param).toBe("limit")
  })

  it("returns contacts when firstNameIndex is provided", async () => {
    const response = await GET(
      createRequest("/api/apple-contacts/search?firstNameIndex=abc123")
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.contacts)).toBe(true)
    expect(json.count).toBe(json.contacts.length)
  })

  it("returns contacts when phoneNumberIndex is provided", async () => {
    const response = await GET(
      createRequest("/api/apple-contacts/search?phoneNumberIndex=xyz789")
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
  })

  it("respects limit parameter", async () => {
    mockFindMany.mockResolvedValue(mockContacts.slice(0, 2))

    const response = await GET(
      createRequest("/api/apple-contacts/search?firstNameIndex=abc&limit=2")
    )

    expect(response.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 2 })
    )
  })

  it("defaults limit to 50", async () => {
    const response = await GET(
      createRequest("/api/apple-contacts/search?firstNameIndex=abc")
    )

    expect(response.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    )
  })

  it("parses emails and phoneNumbers as arrays", async () => {
    const response = await GET(
      createRequest("/api/apple-contacts/search?firstNameIndex=abc")
    )

    const json = await response.json()
    expect(json.contacts.length).toBeGreaterThan(0)
    expect(Array.isArray(json.contacts[0].emails)).toBe(true)
    expect(Array.isArray(json.contacts[0].phoneNumbers)).toBe(true)
  })
})
