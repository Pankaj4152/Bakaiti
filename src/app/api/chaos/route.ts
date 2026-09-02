import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateChaos } from "@/lib/gemini"
import { getAuthUser, isConversationMember, getConversationUserMap } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const conversationId = body.conversationId as string | undefined
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: convo } = await admin
    .from("conversations")
    .select("type, user1_id, user2_id")
    .eq("id", conversationId)
    .single()

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const { userIdToName, userNames } = await getConversationUserMap(conversationId, convo)

  const { data: messages } = await admin
    .from("messages")
    .select("content, audio_url, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (!messages || messages.length < 5) {
    return NextResponse.json({ error: "Not enough messages for chaos yet" }, { status: 400 })
  }

  const recentMessages = messages.reverse().map((m) => ({
    sender_name: userIdToName[m.sender_id] ?? "Unknown",
    content: m.content ?? null,
    created_at: m.created_at,
  }))

  const chaos = await generateChaos(recentMessages, userNames)

  if (!chaos) {
    return NextResponse.json({ error: "Failed to generate chaos" }, { status: 500 })
  }

  return NextResponse.json({ chaos })
}