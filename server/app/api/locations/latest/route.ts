import { db } from "@/db"
import { Locations } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { parseSearchParams } from "@/lib/validate-params"
import { and, desc, gte } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"

const searchParamsSchema = z.object({
  within_min: z.coerce.number().int().min(1).optional(),
}).strict()

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "locations")
  if (!auth.authorized) {
    return auth.response
  }

  const result = parseSearchParams(new URL(request.url).searchParams, searchParamsSchema)
  if (!result.ok) {
    return result.response
  }
  const { within_min } = result.params

  const conditions = []
  if (within_min) {
    const cutoff = new Date(Date.now() - within_min * 60 * 1000)
    conditions.push(gte(Locations.timestamp, cutoff))
  }
  const windowCutoff = getDataWindowCutoff(auth.token)
  if (windowCutoff) {
    conditions.push(gte(Locations.timestamp, windowCutoff))
  }

  const latest = await db.query.Locations.findFirst({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(Locations.timestamp)],
  })

  await logRead({
    type: "location",
    description: "Fetched latest location",
    count: latest ? 1 : 0,
    token: auth.token,
  })

  if (!latest) {
    return Response.json({ success: true, location: null })
  }

  // Over 10 minutes old.
  const latestIsOld = Date.now() - latest.timestamp.getTime() > 10 * 60 * 1000
  if (latestIsOld) {
    console.warn("Latest location is over 10 minutes old")
  }

  return Response.json({
    success: true,
    location: {
      id: latest.id,
      latitude: latest.latitude,
      longitude: latest.longitude,
      accuracy: latest.accuracy,
      metadata: latest.metadata,
      timestamp: latest.timestamp.toISOString(),
    },
  })
}
