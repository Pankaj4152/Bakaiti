import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser, isConversationMember } from "@/lib/auth"

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { conversationId?: string }
  if (!body.conversationId) return NextResponse.json({ error: "Conversation is required" }, { status: 400 })
  if (!(await isConversationMember(user.id, body.conversationId, false))) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("archived_conversations").upsert({
    user_id: user.id,
    conversation_id: body.conversationId,
    archived_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: "Could not hide chat" }, { status: 500 })
  return NextResponse.json({ success: true })
}
