import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  // Only update last_seen for the authenticated user's own row.
  const admin = createAdminClient()
  await admin
    .from("allowed_users")
    .update({ last_seen: new Date().toISOString() })
    .eq("email", user.email.toLowerCase().trim())

  return NextResponse.json({ ok: true })
}