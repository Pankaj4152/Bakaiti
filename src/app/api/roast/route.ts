import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateRoast } from "@/lib/gemini"
import { getAuthUser, isConversationMember } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const conversationId = body.conversationId as string | undefined
  const triggerUserId = body.triggerUserId as string | undefined
  const userText = body.userText as string | undefined
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: convo } = await admin
    .from("conversations")
    .select("user1_id, user2_id")
    .eq("id", conversationId)
    .single()

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const { data: allUsers } = await admin.from("allowed_users").select("id, name").in("id", [convo.user1_id, convo.user2_id])
  const userIdToName: Record<string, string> = {}
  const userNames: string[] = []
  if (allUsers) for (const u of allUsers) {
    userIdToName[u.id] = u.name
    userNames.push(u.name)
  }

  const triggerName = triggerUserId ? userIdToName[triggerUserId] : null

  const { data: summaries } = await admin
    .from("daily_summaries")
    .select("date, content")
    .eq("conversation_id", conversationId)
    .order("date", { ascending: false })
    .limit(7)

  const { data: messages } = await admin
    .from("messages")
    .select("content, audio_url, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (!messages || messages.length < 5) {
    return NextResponse.json({ error: "Not enough messages to roast yet" }, { status: 400 })
  }

  const recentMessages = messages.reverse().map((m) => ({
    sender_name: userIdToName[m.sender_id] ?? "Unknown",
    content: m.content ?? null,
    created_at: m.created_at,
  }))

  const roast = await generateRoast(summaries ?? [], recentMessages, userNames, triggerName ?? userNames[0], userText)

  if (!roast) {
    return NextResponse.json({ error: "Failed to generate roast" }, { status: 500 })
  }

  return NextResponse.json({ roast })
}