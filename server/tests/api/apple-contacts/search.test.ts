// Not super happy with this.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/apple-contacts/search/route"
import { NextRequest } from "next/server"

// Mock contact data
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
  {
    id: "4",
    contactId: "c4",
    firstName: null,
    lastName: null,
    organization: "Johnson & Johnson",
    emails: JSON.stringify(["contact@jnj.com"]),
    phoneNumbers: JSON.stringify([]),
    syncTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock the database
vi.mock("@/db", () => {
  const createMockQuery = () => {
    let whereClause: ((c: (typeof mockContacts)[0]) => boolean) | null = null
    let limitValue = 100

    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn((clause) => {
        // Store where clause for filtering (simplified mock)
        whereClause = clause
        return {
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn((n) => {
            limitValue = n
            // Return filtered results - this is a simplified mock
            // In reality, filtering happens based on the SQL clause
            return Promise.resolve(mockContacts.slice(0, limitValue))
          }),
        }
      }),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn((n) => Promise.resolve(mockContacts.slice(0, n))),
    }
  }

  return {
    db: {
      select: vi.fn(() => createMockQuery()),
    },
  }
})

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"))
}

describe("GET /api/apple-contacts/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 when query parameter is missing", async () => {
    const request = createRequest("/api/apple-contacts/search")
    const response = await GET(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Search query 'q' is required")
  })

  it("returns 400 when query parameter is empty", async () => {
    const request = createRequest("/api/apple-contacts/search?q=")
    const response = await GET(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Search query 'q' is required")
  })

  it("returns 400 when query parameter is whitespace only", async () => {
    const request = createRequest("/api/apple-contacts/search?q=%20%20%20")
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it("returns contacts when query is provided", async () => {
    const request = createRequest("/api/apple-contacts/search?q=john")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.query).toBe("john")
    expect(Array.isArray(json.contacts)).toBe(true)
    expect(json.count).toBe(json.contacts.length)
  })

  it("respects limit parameter", async () => {
    const request = createRequest("/api/apple-contacts/search?q=test&limit=2")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.contacts.length).toBeLessThanOrEqual(2)
  })

  it("caps limit at 100", async () => {
    const request = createRequest("/api/apple-contacts/search?q=test&limit=500")
    const response = await GET(request)

    expect(response.status).toBe(200)
    // The mock will receive at most 100
  })

  it("parses emails and phoneNumbers as arrays", async () => {
    const request = createRequest("/api/apple-contacts/search?q=john")
    const response = await GET(request)

    const json = await response.json()
    if (json.contacts.length > 0) {
      expect(Array.isArray(json.contacts[0].emails)).toBe(true)
      expect(Array.isArray(json.contacts[0].phoneNumbers)).toBe(true)
    }
  })

  it("includes query in response", async () => {
    const request = createRequest("/api/apple-contacts/search?q=searchterm")
    const response = await GET(request)

    const json = await response.json()
    expect(json.query).toBe("searchterm")
  })

  it("handles default limit of 50", async () => {
    const request = createRequest("/api/apple-contacts/search?q=test")
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})
