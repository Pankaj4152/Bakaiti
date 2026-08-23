import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  return NextResponse.json(
    {
      version: "1.0.2",
      type: "apk_update",
      apkUrl: "https://bakaiti-ten.vercel.app/downloads/bakaiti-latest.apk",
      changeNotes: "Fixed notification drawer, image picker, and chat improvements",
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    }
  )
}
