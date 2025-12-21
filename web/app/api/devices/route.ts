import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Devices } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const allDevices = await db.query.Devices.findMany({
    orderBy: [desc(Devices.createdAt)],
  })

  return NextResponse.json(allDevices)
}
