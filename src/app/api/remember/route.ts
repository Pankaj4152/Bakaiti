import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const { conversationId, username } = await request.json()
  if (!conversationId || !username) {
    return NextResponse.json({ error: "Missing conversationId or username" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: targetUser } = await admin
    .from("allowed_users")
    .select("id, name")
    .eq("username", username.toLowerCase().replace("@", ""))
    .maybeSingle()

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { data: memories } = await admin
    .from("memories")
    .select("type, content, context")
    .eq("target_user_id", targetUser.id)
    .eq("conversation_id", conversationId)
    .gte("confidence", 0.7)

  const { data: quotes } = await admin
    .from("legendary_quotes")
    .select("quote, context")
    .eq("user_id", targetUser.id)

  const grouped: Record<string, { type: string; items: { content: string; context?: string }[] }> = {}
  if (memories) for (const m of memories) {
    if (!grouped[m.type]) grouped[m.type] = { type: m.type, items: [] }
    grouped[m.type].items.push({ content: m.content, context: m.context ?? undefined })
  }

  return NextResponse.json({
    name: targetUser.name,
    memories: grouped,
    quotes: quotes ?? [],
  })
}
