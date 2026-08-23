import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  return NextResponse.json(
    {
      version: "1.0.0",
      // Set type: "apk_update" to prompt users to download new APK, "major" for web update, or "minor" for silent update
      type: "minor",
      apkUrl: "https://github.com/Pankaj4152/Bakaiti/releases/latest",
      changeNotes: "Bug fixes and performance improvements",
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    }
  )
}
