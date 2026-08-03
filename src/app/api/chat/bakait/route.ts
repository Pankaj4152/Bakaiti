import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { chatAsBakait } from "@/lib/gemini"
import { getAuthUser, isConversationMember } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const message = body.message as string | undefined
  const conversationId = body.conversationId as string | undefined
  if (!message || !conversationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const user = await getAuthUser()
  const senderId = body.senderId as string | undefined
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  // Real sender must match the caller.
  if (senderId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

  // Fetch recent context SERVER-SIDE instead of trusting client-fabricated recentMessages.
  const { data: recent } = await admin
    .from("messages")
    .select("content, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(25)

  const mappedRecent = (recent ?? []).reverse().map((m) => ({
    sender_name: userIdToName[m.sender_id] ?? "Unknown",
    content: m.content ?? null,
  }))

  const reply = await chatAsBakait(message, mappedRecent, userNames)

  if (!reply) {
    return NextResponse.json({ error: "Bakait is thinking too hard" }, { status: 500 })
  }

  return NextResponse.json({ reply })
}