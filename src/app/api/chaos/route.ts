import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateChaos } from "@/lib/gemini"

export async function POST(request: Request) {
  const { conversationId } = await request.json()
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

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
