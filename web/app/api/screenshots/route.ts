import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { resizeScreenshot } from "@/lib/image-resize"
import { config } from "@/lib/config"
import { logWrite } from "@/lib/activity-log"
import { protectApiWrite } from "../lib"
import sharp from "sharp"

export const POST = protectApiWrite(async (request: NextRequest) => {
  const contentType = request.headers.get("content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("screenshot") as File | null

  if (!file) {
    return NextResponse.json(
      { error: "No screenshot file provided" },
      { status: 400 }
    )
  }

  const maxBytes = config.upload.maxFileSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max size: ${config.upload.maxFileSizeMB}MB` },
      { status: 400 }
    )
  }

  const imageBuffer = Buffer.from(await file.arrayBuffer())

  if (imageBuffer.length === 0) {
    return NextResponse.json(
      { error: "Screenshot file is empty" },
      { status: 400 }
    )
  }

  const resizedBuffer = await resizeScreenshot(imageBuffer)
  const metadata = await sharp(resizedBuffer).metadata()

  const outputBase64 = resizedBuffer.toString("base64")
  const dataUrl = `data:image/webp;base64,${outputBase64}`

  const [screenshot] = await db
    .insert(Screenshots)
    .values({
      data: dataUrl,
      width: metadata.width || 0,
      height: metadata.height || 0,
      sizeBytes: resizedBuffer.length,
    })
    .returning()

  await logWrite({
    type: "screenshot",
    description: `Uploaded screenshot (${metadata.width}x${metadata.height})`,
    metadata: { sizeBytes: resizedBuffer.length },
  })

  return NextResponse.json({
    id: screenshot.id,
    width: screenshot.width,
    height: screenshot.height,
    sizeBytes: screenshot.sizeBytes,
    capturedAt: screenshot.capturedAt,
  })
})
