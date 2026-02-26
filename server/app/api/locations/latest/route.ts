import { db } from "@/db"
import { Locations } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { rejectUnknownParams } from "@/lib/validate-params"
import { and, desc, gte } from "drizzle-orm"
import { NextRequest } from "next/server"

const ALLOWED_PARAMS = ["within_min"]

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "locations")
  if (!auth.authorized) {
    return auth.response
  }

  const { searchParams } = new URL(request.url)

  const unknownParamsError = rejectUnknownParams(searchParams, ALLOWED_PARAMS)
  if (unknownParamsError) {
    return unknownParamsError
  }
  const withinMinParam = searchParams.get("within_min")
  const withinMin = withinMinParam ? parseInt(withinMinParam, 10) : null

  if (withinMinParam !== null && (isNaN(withinMin!) || withinMin! < 1)) {
    return Response.json(
      { error: "within_min must be a positive integer" },
      { status: 400 }
    )
  }

  const conditions = []
  if (withinMin) {
    const cutoff = new Date(Date.now() - withinMin * 60 * 1000)
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
