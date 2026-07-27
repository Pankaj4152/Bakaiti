import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { log } from "@/lib/logger"

export async function POST(request: Request) {
  const { email, name, username, avatar_url, status } = await request.json()
  log.info("UPDATE-PROFILE", "Received:", { email, name, username, status })

  if (!email) {
    log.warn("UPDATE-PROFILE", "No email provided")
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const cleanEmail = email.toLowerCase().trim()

  const row: Record<string, string | null> = {
    email: cleanEmail,
    name: name?.trim() || username?.trim() || cleanEmail.split("@")[0],
    username: username?.toLowerCase().trim() || null,
    avatar_url: avatar_url || null,
    status: status?.trim() || "pending",
  }
  log.info("UPDATE-PROFILE", "Row to upsert:", row)

  // Check if user exists by email
  const { error: existingError, data: existing } = await adminDb
    .from("allowed_users")
    .select("id, username")
    .eq("email", cleanEmail)
    .maybeSingle()

  if (existingError) {
    log.error("UPDATE-PROFILE", "Email lookup failed:", existingError.message)
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  // Check username uniqueness (exclude own row if updating)
  if (row.username) {
    const usernameQuery = adminDb
      .from("allowed_users")
      .select("id")
      .eq("username", row.username)

    if (existing) {
      usernameQuery.neq("id", existing.id)
    }

    const { data: usernameTaken } = await usernameQuery.maybeSingle()
    if (usernameTaken) {
      log.warn("UPDATE-PROFILE", "Username taken:", row.username)
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }
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
