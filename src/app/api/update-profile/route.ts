import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { log } from "@/lib/logger"

export async function POST(request: Request) {
  const { email, name, username, status } = await request.json()
  log.info("UPDATE-PROFILE", "Received:", { email, name, username, status })

  if (!email) {
    log.warn("UPDATE-PROFILE", "No email provided")
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const cleanEmail = email.toLowerCase().trim()

  const row = {
    email: cleanEmail,
    name: name?.trim() || username?.trim() || cleanEmail.split("@")[0],
    username: username?.toLowerCase().trim() || null,
    status: status?.trim() || "pending",
  }
  log.info("UPDATE-PROFILE", "Row to upsert:", row)

  log.info("UPDATE-PROFILE", "Checking if user exists in allowed_users")
  const { error: existingError, data: existing } = await adminDb
    .from("allowed_users")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle()

  if (existingError) {
    log.error("UPDATE-PROFILE", "Lookup failed:", existingError.message)
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  log.info("UPDATE-PROFILE", existing ? "User exists, updating" : "User not found, inserting")

  let dbError
  if (existing) {
    ({ error: dbError } = await adminDb.from("allowed_users").update(row).eq("email", cleanEmail))
  } else {
    ({ error: dbError } = await adminDb.from("allowed_users").insert(row))
  }

  if (dbError) {
    log.error("UPDATE-PROFILE", "DB operation failed:", dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  log.info("UPDATE-PROFILE", "Success")
  return NextResponse.json({ success: true })
}
