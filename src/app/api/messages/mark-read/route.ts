import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser, isConversationMember } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const conversationId = body.conversationId as string | undefined
  const messageIds = Array.isArray(body.messageIds)
    ? body.messageIds.filter((id): id is string => typeof id === "string").slice(0, 100)
    : []
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 })
  if (messageIds.length === 0) return NextResponse.json({ error: "messageIds required" }, { status: 400 })

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .in("id", messageIds)
    .neq("sender_id", user.id)
    .eq("read", false)

  if (error) {
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: messageIds.length })
}
