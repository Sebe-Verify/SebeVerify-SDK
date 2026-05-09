import { NextRequest, NextResponse } from "next/server"
import { completeSession, getSession } from "@/lib/mock-api"
import fs from "fs/promises"
import path from "path"

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteCtx) {
  const { id } = await params

  const session = getSession(id)
  if (session && process.env.NODE_ENV === "development") {
    try {
      const dataDir = path.join(process.cwd(), "document_data", id)
      await fs.mkdir(dataDir, { recursive: true })

      const saveImage = async (base64str: string | undefined, filename: string) => {
        if (!base64str) return
        const base64Data = base64str.replace(/^data:image\/\w+;base64,/, "")
        await fs.writeFile(path.join(dataDir, filename), base64Data, "base64")
      }

      await saveImage(session.frontImage, "front.jpg")
      await saveImage(session.backImage, "back.jpg")
      await saveImage(session.selfieImage, "selfie.jpg")

      if (session.livenessImages && Array.isArray(session.livenessImages)) {
        for (let i = 0; i < session.livenessImages.length; i++) {
          await saveImage(session.livenessImages[i], `liveness_${i + 1}.jpg`)
        }
      }

      await fs.writeFile(
        path.join(dataDir, "metadata.json"),
        JSON.stringify(
          {
            documentType: session.documentType,
            status: "approved",
            livenessImagesVerified: session.livenessImages?.length || 0,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      )
    } catch (err) {
      console.error("Failed to save document data:", err)
    }
  }

  const result = completeSession(id)
  if (!result.success) {
    return NextResponse.json({ success: false }, { status: 404 })
  }
  return NextResponse.json({ success: true, status: "approved" })
}
