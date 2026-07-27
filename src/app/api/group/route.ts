import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { name, participantIds } = await request.json()
  if (!name || !participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
    return NextResponse.json({ error: "Need at least 2 participants and a group name" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const allIds = [...new Set([profile.id, ...participantIds])]

  const { data: convo } = await admin
    .from("conversations")
    .insert({
      user1_id: profile.id,
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
    return NextResponse.json({ error: participantError.message }, { status: 500 })
  }

  return NextResponse.json({ id: convo.id })
}
