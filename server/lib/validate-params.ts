import { z } from "zod"

type ParseResult<T> =
  | { ok: true; params: T }
  | { ok: false; response: Response }

export function parseSearchParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): ParseResult<z.infer<T>> {
  const raw: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    raw[key] = value
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      response: Response.json(
        { error: formatParamError(result.error) },
        { status: 400 }
      ),
    }
  }

  return { ok: true, params: result.data }
}

function formatParamError(error: z.ZodError) {
  const issue = error.issues[0]

  if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    const keys = issue.keys
    const paramList = keys.map((k) => `"${k}"`).join(", ")
    return {
      type: "invalid_request_error" as const,
      message:
        keys.length === 1
          ? `Received unknown parameter: ${paramList}`
          : `Received unknown parameters: ${paramList}`,
      params: keys,
    }
  }

  const param = issue.path.length > 0 ? String(issue.path[0]) : undefined
  return {
    type: "invalid_request_error" as const,
    message: issue.message,
    ...(param ? { param } : {}),
  }
}

export const paginationSchema = {
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}
