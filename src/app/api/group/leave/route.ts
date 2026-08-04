import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const conversationId = body.conversationId as string | undefined
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: convo } = await admin
    .from("conversations")
    .select("id, type, user1_id, admin_id")
    .eq("id", conversationId)
    .maybeSingle()

  if (!convo || convo.type !== "group") {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }
  if (convo.admin_id === user.id || convo.user1_id === user.id) {
    return NextResponse.json({ error: "Owner cannot leave" }, { status: 400 })
  }

  const { error } = await admin
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to leave group" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
