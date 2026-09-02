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

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: conversations, error } = await admin
    .from("conversations")
    .select("id, name, type, created_at, last_message_at, user1:allowed_users!user1_id(name, email), user2:allowed_users!user2_id(name, email)")
    .order("last_message_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ conversations: conversations ?? [] })
}

export async function DELETE(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get("conversationId")

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("conversations")
    .delete()
    .eq("id", conversationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
