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
  const conversationId = searchParams.get("conversationId")

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get conversation info
  const { data: conversation } = await admin
    .from("conversations")
    .select("id, name, type, user1:allowed_users!user1_id(name, username), user2:allowed_users!user2_id(name, username)")
    .eq("id", conversationId)
    .maybeSingle()

  // Get all messages with sender details
  const { data: messages, error } = await admin
    .from("messages")
    .select("*, sender:allowed_users(name, username, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    conversation,
    messages: messages ?? [],
  })
}

export async function DELETE(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const messageId = searchParams.get("messageId")

  if (!messageId) {
    return NextResponse.json({ error: "Missing messageId" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("messages")
    .delete()
    .eq("id", messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
