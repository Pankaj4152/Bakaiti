import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { log } from "@/lib/logger"

export async function POST(request: Request) {
  const { username, excludeEmail } = await request.json()

  if (!username || typeof username !== "string") {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  const clean = username.toLowerCase().trim()
  log.info("CHECK-USERNAME", "Checking:", clean, excludeEmail ? `(exclude: ${excludeEmail})` : "")

  const adminDb = createAdminClient()
  let query = adminDb
    .from("allowed_users")
    .select("id")
    .eq("username", clean)

  if (excludeEmail) {
    query = query.neq("email", excludeEmail.toLowerCase().trim())
  }

  const { data, error } = await query.maybeSingle()

  if (error) log.error("CHECK-USERNAME", "DB error:", error.message)

  const available = !data
  log.info("CHECK-USERNAME", clean, available ? "available" : "taken")
  return NextResponse.json({ available })
}
