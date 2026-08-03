import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"
import { log } from "@/lib/logger"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { name, username, avatar_url } = body

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  // Never accept "status" or "email" from the client. Identity is derived from the session.
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const cleanEmail = authUser.email.toLowerCase().trim()

  const row: Record<string, string | null> = {}
  if (typeof name === "string" && name.trim()) row.name = name.trim()
  if (typeof username === "string") {
    const cleanUsername = username.toLowerCase().replace(/^@/, "").trim()
    if (cleanUsername) {
      if (!/^[a-z0-9_-]{2,30}$/.test(cleanUsername)) {
        return NextResponse.json({ error: "Username must be 3-30 chars (letters, numbers, _, -)" }, { status: 400 })
      }
      row.username = cleanUsername
    }
  }
  if (typeof avatar_url === "string" && avatar_url.trim()) row.avatar_url = avatar_url.trim()

  const adminDb = createAdminClient()

  // Check user exists by email (session identity)
  const { error: existingError, data: existing } = await adminDb
    .from("allowed_users")
    .select("id, username")
    .eq("email", cleanEmail)
    .maybeSingle()

  if (existingError) {
    log.error("UPDATE-PROFILE", "Email lookup failed:", existingError.message)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
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

  let dbError
  if (existing) {
    // Only ever update the caller's own row by session-derived email.
    const userRow: Record<string, string | null> = {}
    if (row.name) userRow.name = row.name
    if ("username" in row) userRow.username = row.username
    if ("avatar_url" in row) userRow.avatar_url = row.avatar_url
    if (Object.keys(userRow).length === 0) {
      return NextResponse.json({ success: true })
    }
    ({ error: dbError } = await adminDb.from("allowed_users").update(userRow).eq("email", cleanEmail))
  } else {
    // First-time on-boarding: insert with status "pending". Admin approval is required separately.
    ({ error: dbError } = await adminDb.from("allowed_users").insert({
      email: cleanEmail,
      name: row.name ?? cleanEmail.split("@")[0],
      username: row.username ?? null,
      avatar_url: row.avatar_url ?? null,
      status: "pending",
    }))
  }

  if (dbError) {
    log.error("UPDATE-PROFILE", "DB operation failed:", dbError.message)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  log.info("UPDATE-PROFILE", "Success", cleanEmail)
  return NextResponse.json({ success: true })
}