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
  const messageId = body.messageId as string | undefined
  if (!conversationId || !messageId) {
    return NextResponse.json({ error: "Missing conversationId or messageId" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from("pinned_messages")
    .insert({ conversation_id: conversationId, message_id: messageId, pinned_by: user.id })

  if (error?.message?.includes("duplicate")) {
    return NextResponse.json({ alreadyPinned: true })
  }

  if (error) return NextResponse.json({ error: "Failed to pin message" }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const url = new URL(request.url)
  const messageId = url.searchParams.get("messageId")
  if (!messageId) return NextResponse.json({ error: "Missing messageId" }, { status: 400 })

  const admin = createAdminClient()

  const { error } = await admin
    .from("pinned_messages")
    .delete()
    .eq("message_id", messageId)

  if (error) return NextResponse.json({ error: "Failed to unpin message" }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const url = new URL(request.url)
  const conversationId = url.searchParams.get("conversationId")
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("pinned_messages")
    .select("id, message_id, created_at, pinned_by, message:messages(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Failed to load pins" }, { status: 500 })

  return NextResponse.json({ pins: data ?? [] })
}