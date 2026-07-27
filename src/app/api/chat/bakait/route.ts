import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { chatAsBakait } from "@/lib/gemini"

export async function POST(request: Request) {
  const { message, recentMessages, senderId, conversationId } = await request.json()
  if (!message || !conversationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
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

  const mappedRecent = (recentMessages ?? []).map((m: any) => ({
    sender_name: userIdToName[m.sender_id] ?? m.sender_name ?? "Unknown",
    content: m.content ?? null,
  }))

  const reply = await chatAsBakait(message, mappedRecent, userNames)

  if (!reply) {
    return NextResponse.json({ error: "Bakait is thinking too hard" }, { status: 500 })
  }

  return NextResponse.json({ reply })
}
