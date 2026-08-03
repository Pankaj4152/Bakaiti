import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const theme = body.theme
  if (typeof theme !== "string" || !theme) {
    return NextResponse.json({ error: "Missing theme" }, { status: 400 })
  }

  const validThemes = ["default", "orange", "cyberpunk", "discord", "whatsapp", "terminal"]
  if (!validThemes.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("allowed_users")
    .update({ theme })
    .eq("email", user.email)

  if (error) return NextResponse.json({ error: "Failed to update theme" }, { status: 500 })

  return NextResponse.json({ success: true, theme })
}
