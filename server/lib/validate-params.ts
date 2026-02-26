export function rejectUnknownParams(
  searchParams: URLSearchParams,
  allowedParams: string[]
): Response | null {
  const allowed = new Set(allowedParams)
  const unknown: string[] = []

  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      unknown.push(key)
    }
  }

  if (unknown.length === 0) {
    return null
  }

  const paramList = unknown.map((p) => `"${p}"`).join(", ")
  const message =
    unknown.length === 1
      ? `Received unknown parameter: ${paramList}`
      : `Received unknown parameters: ${paramList}`

  return Response.json(
    {
      error: {
        type: "invalid_request_error",
        message,
        params: unknown,
      },
    },
    { status: 400 }
  )
}
