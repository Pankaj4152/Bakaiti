import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

async function isAuthorized() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("bakaiti_admin_token")?.value
  if (adminToken === "secret_admin_session_granted") return true

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user?.email
}

export async function GET(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")?.trim()

  const admin = createAdminClient()
  let dbQuery = admin
    .from("allowed_users")
    .select("id, name, username, email, status, avatar_url, created_at, last_seen")
    .order("created_at", { ascending: false })

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%`)
  }

  const { data: users, error } = await dbQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: users ?? [] })
}

export async function PATCH(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { targetUserId, newStatus } = body

  if (!targetUserId || !["approved", "pending", "blocked"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid target user or status" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("allowed_users")
    .update({ status: newStatus })
    .eq("id", targetUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, updatedStatus: newStatus })
}
