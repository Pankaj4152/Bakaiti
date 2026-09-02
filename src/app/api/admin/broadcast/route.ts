import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

async function isAuthorized() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("bakaiti_admin_token")?.value
  if (adminToken === "secret_admin_session_granted") return true

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user?.email
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title, message } = await request.json()
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Save broadcast to system_broadcasts table
    const { error: dbErr } = await admin
      .from("system_broadcasts")
      .insert([{ title, message, type: "banner" }])

    if (dbErr && !dbErr.message.includes("does not exist")) {
      console.error("Failed to insert broadcast to DB:", dbErr)
    }

    return NextResponse.json({ success: true, title, message })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to publish broadcast" }, { status: 500 })
  }
}
