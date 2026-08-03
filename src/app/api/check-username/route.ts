import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { log } from "@/lib/logger"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  const username = body.username
  if (typeof username !== "string") {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  // Normalize: lowercase, strip a leading @, enforce a safe character set.
  const clean = username.toLowerCase().replace(/^@/, "").trim()
  if (!/^[a-z0-9_-]{2,30}$/.test(clean)) {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from("allowed_users")
    .select("id")
    .eq("username", clean)
    .maybeSingle()

  if (error) {
    log.error("CHECK-USERNAME", "DB error:", error.message)
    return NextResponse.json({ available: false }, { status: 500 })
  }

  return NextResponse.json({ available: !data })
}