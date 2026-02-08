import { validateAccessToken } from "./access-tokens"
import { secureCompare } from "./auth-utils"

const API_WRITE_SECRET = process.env.API_WRITE_SECRET || ""

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  return authHeader.slice(7)
}

// Returns null if authorized. Returns a Response to send if unauthorized.
export async function requireReadAuth(
  request: Request
): Promise<Response | null> {
  const token = getBearerToken(request)
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accessToken = await validateAccessToken(token)
  if (accessToken) {
    return null
  }

  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

// Returns null if authorized. Returns a Response to send if unauthorized.
export async function requireWriteAuth(
  request: Request
): Promise<Response | null> {
  const token = getBearerToken(request)
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only the static write secret is accepted for writes
  if (API_WRITE_SECRET && secureCompare(token, API_WRITE_SECRET)) {
    return null
  }

  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
