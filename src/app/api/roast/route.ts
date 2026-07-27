import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateRoast } from "@/lib/gemini"

export async function POST(request: Request) {
  const { conversationId, triggerUserId, userText } = await request.json()
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

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
