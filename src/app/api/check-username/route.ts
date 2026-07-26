import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { log } from "@/lib/logger"

export async function POST(request: Request) {
  const { username } = await request.json()

  if (!username || typeof username !== "string") {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  const clean = username.toLowerCase().trim()
  log.info("CHECK-USERNAME", "Checking:", clean)

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from("allowed_users")
    .select("id")
    .eq("username", clean)
    .maybeSingle()

  if (error) log.error("CHECK-USERNAME", "DB error:", error.message)

  const available = !data
  log.info("CHECK-USERNAME", clean, available ? "available" : "taken")
  return NextResponse.json({ available })
}
