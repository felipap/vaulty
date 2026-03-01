import { db } from "@/db"
import { WriteJobs } from "@/db/schema"
import { requireReadAuth } from "@/lib/api-auth"
import { z } from "zod"
import { NextRequest } from "next/server"

const ALLOWED_RECIPIENTS = parseRecipientWhitelist(
  process.env.IMESSAGE_ALLOWED_RECIPIENTS
)

function parseRecipientWhitelist(
  envVar: string | undefined
): Set<string> | null {
  if (!envVar || envVar.trim() === "") {
    return null
  }
  return new Set(
    envVar
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter((r) => r.length > 0)
  )
}

function isRecipientAllowed(recipient: string): boolean {
  if (!ALLOWED_RECIPIENTS) {
    return false
  }
  if (ALLOWED_RECIPIENTS.has("*")) {
    return true
  }
  return ALLOWED_RECIPIENTS.has(recipient.toLowerCase())
}

const SendSchema = z.object({
  recipient: z.string().min(1),
  message: z.string().min(1),
})

export async function POST(request: NextRequest) {
  if (!ALLOWED_RECIPIENTS || ALLOWED_RECIPIENTS.size === 0) {
    return Response.json(
      {
        error:
          "iMessage sending is disabled. Set IMESSAGE_ALLOWED_RECIPIENTS in your environment (use * to allow all).",
      },
      { status: 403 }
    )
  }

  const auth = await requireReadAuth(request, "imessage:send")
  if (!auth.authorized) {
    return auth.response
  }

  const json = await request.json()

  const parsed = SendSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    )
  }

  const { recipient, message } = parsed.data

  if (!isRecipientAllowed(recipient)) {
    return Response.json(
      {
        error: `Recipient "${recipient}" is not in the allowed recipients list.`,
      },
      { status: 403 }
    )
  }

  const [job] = await db
    .insert(WriteJobs)
    .values({
      type: "imessage_send",
      payload: { recipient, message },
      accessTokenId: auth.token.accessTokenId,
      tokenPrefix: auth.token.tokenPrefix,
    })
    .returning()

  console.log(`Created write job ${job.id}: imessage_send to ${recipient}`)

  return Response.json({
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
  })
}
