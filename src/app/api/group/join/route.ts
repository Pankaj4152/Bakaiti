import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let groupId = (body.groupId as string | undefined)?.trim()
  if (!groupId) {
    return NextResponse.json({ error: "Missing Group ID or Link" }, { status: 400 })
  }

  // Extract raw UUID if user pasted a full group URL
  const match = groupId.match(/chat\/group\/([a-f0-9-]+)/i)
  if (match?.[1]) {
    groupId = match[1]
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  // Verify group exists
  const { data: convo } = await admin
    .from("conversations")
    .select("id, name, type")
    .eq("id", groupId)
    .maybeSingle()

  if (!convo || convo.type !== "group") {
    return NextResponse.json({ error: "Group not found with this ID" }, { status: 404 })
  }

  // Upsert user into group participants
  const { error } = await admin
    .from("conversation_participants")
    .upsert({ conversation_id: convo.id, user_id: user.id }, { onConflict: "conversation_id,user_id" })

  if (error) {
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 })
  }

  return NextResponse.json({ success: true, conversationId: convo.id, groupName: convo.name })
}
