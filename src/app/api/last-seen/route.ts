import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const admin = createAdminClient()
  await admin.from("allowed_users").update({ last_seen: new Date().toISOString() }).eq("email", email)

  return NextResponse.json({ ok: true })
}
