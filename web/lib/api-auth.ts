import { validateAccessToken } from "./access-tokens"
import { secureCompare } from "./auth-utils"

const API_WRITE_SECRET = process.env.API_WRITE_SECRET || ""

export type TokenIdentity = {
  accessTokenId: string
  tokenPrefix: string
}

type AuthResult =
  | { authorized: true; token: TokenIdentity }
  | { authorized: false; response: Response }

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  return authHeader.slice(7)
}

function maskToken(token: string): string {
  if (token.length <= 8) {
    return token.slice(0, 3) + "..."
  }
  return token.slice(0, 7) + "..." + token.slice(-4)
}

function authError(message: string, status = 401) {
  return Response.json(
    {
      error: {
        message,
        type: "authentication_error",
      },
    },
    { status }
  )
}

export async function requireReadAuth(request: Request): Promise<AuthResult> {
  const token = getBearerToken(request)
  if (!token) {
    return {
      authorized: false,
      response: authError(
        "Missing API key. Include an Authorization header with 'Bearer <token>'."
      ),
    }
  }

  const accessToken = await validateAccessToken(token)
  if (accessToken) {
    return {
      authorized: true,
      token: {
        accessTokenId: accessToken.id,
        tokenPrefix: accessToken.tokenPrefix,
      },
    }
  }

  return {
    authorized: false,
    response: authError(`Invalid API key provided: ${maskToken(token)}`),
  }
}

// Returns null if authorized. Returns a Response to send if unauthorized.
export async function requireWriteAuth(
  request: Request
): Promise<Response | null> {
  const token = getBearerToken(request)
  if (!token) {
    return authError(
      "Missing API key. Include an Authorization header with 'Bearer <token>'."
    )
  }

  // Only the static write secret is accepted for writes
  if (API_WRITE_SECRET && secureCompare(token, API_WRITE_SECRET)) {
    return null
  }

  return authError(`Invalid API key provided: ${maskToken(token)}`)
}
