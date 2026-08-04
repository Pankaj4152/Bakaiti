import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

const MAX_GROUP_NAME = 60

type AdminClient = ReturnType<typeof createAdminClient>

async function loadGroup(admin: AdminClient, conversationId: string) {
  return admin
    .from("conversations")
    .select("id, name, type, user1_id, admin_id")
    .eq("id", conversationId)
    .maybeSingle()
}

async function validateUsers(admin: AdminClient, ids: string[]): Promise<Set<string>> {
  const { data } = await admin.from("allowed_users").select("id").in("id", ids).eq("status", "approved")
  return new Set((data ?? []).map((u) => u.id))
}

// POST: create a new group conversation. The creator is the owner/admin.
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = body.name as string | undefined
  const participantIds = body.participantIds as string[] | undefined
  if (!name || !name.trim() || !participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
    return NextResponse.json({ error: "Need at least 1 participant and a group name" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  const allIds = [...new Set([user.id, ...participantIds])]

  const validIds = await validateUsers(admin, allIds)
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
      admin_id: user.id,
      name: name.trim().slice(0, MAX_GROUP_NAME),
      type: "group",
    })
    .select("id")
    .single()

  if (!convo) return NextResponse.json({ error: "Failed to create group" }, { status: 500 })

  const participantRows = allIds.map((userId) => ({
    conversation_id: convo.id,
    user_id: userId,
  }))

  const { error: participantError } = await admin.from("conversation_participants").insert(participantRows)

  if (participantError) {
    return NextResponse.json({ error: "Failed to add participants" }, { status: 500 })
  }

  return NextResponse.json({ id: convo.id })
}

// PATCH: rename group / add / remove members. Owner (admin_id) only.
export async function PATCH(request: Request) {
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

  const admin = createAdminClient()

  const { data: convo } = await loadGroup(admin, conversationId)
  if (!convo || convo.type !== "group") {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }
  if (convo.admin_id !== user.id && convo.user1_id !== user.id) {
    return NextResponse.json({ error: "Only the group owner can manage the group" }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}

  const name = body.name as string | undefined
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Invalid group name" }, { status: 400 })
    }
    updates.name = name.trim().slice(0, MAX_GROUP_NAME)
  }

  const { error: updateError } = await admin.from("conversations").update(updates).eq("id", conversationId)
  if (updateError) {
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 })
  }

  const addIds = body.addIds as string[] | undefined
  if (Array.isArray(addIds) && addIds.length > 0) {
    const validIds = await validateUsers(admin, addIds)
    const rows = [...new Set(addIds)]
      .filter((id) => validIds.has(id))
      .map((userId) => ({ conversation_id: conversationId, user_id: userId }))
    if (rows.length > 0) {
      const { error: addError } = await admin.from("conversation_participants").insert(rows)
      if (addError) {
        return NextResponse.json({ error: "Failed to add members" }, { status: 500 })
      }
    }
  }

  const removeIds = body.removeIds as string[] | undefined
  if (Array.isArray(removeIds) && removeIds.length > 0) {
    if (removeIds.includes(convo.admin_id) || removeIds.includes(convo.user1_id)) {
      return NextResponse.json({ error: "Cannot remove the group owner" }, { status: 400 })
    }
    const { error: removeError } = await admin
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .in("user_id", removeIds)
    if (removeError) {
      return NextResponse.json({ error: "Failed to remove members" }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE: delete the whole group conversation. Owner only.
export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const conversationId = url.searchParams.get("conversationId")
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  const { data: convo } = await loadGroup(admin, conversationId)
  if (!convo || convo.type !== "group") {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }
  if (convo.admin_id !== user.id && convo.user1_id !== user.id) {
    return NextResponse.json({ error: "Only the group owner can delete the group" }, { status: 403 })
  }

  const { error } = await admin.from("conversations").delete().eq("id", conversationId)
  if (error) {
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
