import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { log } from "@/lib/logger"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  log.info("CHECK-STATUS", "Looking up:", user.email)

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from("allowed_users")
    .select("status, name, username")
    .eq("email", user.email.toLowerCase().trim())
    .maybeSingle()

  if (error || !data) {
    log.info("CHECK-STATUS", "Not found or error:", error?.message)
    return NextResponse.json({ status: null })
  }

  log.info("CHECK-STATUS", "Status:", data.status)
  return NextResponse.json({ status: data.status, name: data.name, username: data.username })
}
