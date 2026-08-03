import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = body.name as string | undefined
  const participantIds = body.participantIds as string[] | undefined
  if (!name || !participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
    return NextResponse.json({ error: "Need at least 1 participant and a group name" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  const allIds = [...new Set([user.id, ...participantIds])]

  // Validate all participant IDs exist and are approved.
  const { data: validUsers } = await admin
    .from("allowed_users")
    .select("id")
    .in("id", allIds)
    .eq("status", "approved")

  const validIds = new Set((validUsers ?? []).map((u) => u.id))
  for (const id of allIds) {
    if (!validIds.has(id)) {
      return NextResponse.json({ error: "Invalid participant" }, { status: 400 })
    }
  }

  const { data: convo } = await admin
    .from("conversations")
    .insert({
      user1_id: user.id,
      user2_id: null,
      name,
      type: "group",
    })
    .select("id")
    .single()

  if (!convo) return NextResponse.json({ error: "Failed to create group" }, { status: 500 })

  const participantRows = allIds.map((userId) => ({
    conversation_id: convo.id,
    user_id: userId,
  }))

  const { error: participantError } = await admin
    .from("conversation_participants")
    .insert(participantRows)

  if (participantError) {
    return NextResponse.json({ error: "Failed to add participants" }, { status: 500 })
  }

  return NextResponse.json({ id: convo.id })
}