import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

type Body = { userId?: string; requestId?: string; action?: "accept" | "reject" }

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const admin = createAdminClient()
  const { data, error } = await admin.from("friend_requests")
    .select("id, requester_id, recipient_id, status, created_at, responded_at, requester:allowed_users!requester_id(id,name,username,avatar_url), recipient:allowed_users!recipient_id(id,name,username,avatar_url)")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: "Failed to load friend requests" }, { status: 500 })
  return NextResponse.json({ data: data ?? [], currentUserId: user.id })
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Body
  if (!body.userId || body.userId === user.id) return NextResponse.json({ error: "Choose another user" }, { status: 400 })
  const admin = createAdminClient()
  const { data: target } = await admin.from("allowed_users").select("id").eq("id", body.userId).eq("status", "approved").maybeSingle()
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
  const { data: existing } = await admin.from("friend_requests").select("*")
    .or(`and(requester_id.eq.${user.id},recipient_id.eq.${target.id}),and(requester_id.eq.${target.id},recipient_id.eq.${user.id})`).maybeSingle()
  if (existing?.status === "accepted") return NextResponse.json({ error: "You are already friends" }, { status: 409 })
  if (existing?.status === "pending") return NextResponse.json({ error: "A request is already pending" }, { status: 409 })
  if (existing) {
    const { data, error } = await admin.from("friend_requests").update({ requester_id: user.id, recipient_id: target.id, status: "pending", created_at: new Date().toISOString(), responded_at: null }).eq("id", existing.id).select().single()
    if (error) return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 })
    return NextResponse.json({ data })
  }
  const { data, error } = await admin.from("friend_requests").insert({ requester_id: user.id, recipient_id: target.id }).select().single()
  if (error?.code === "23505") return NextResponse.json({ error: "A request is already pending" }, { status: 409 })
  if (error) return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Body
  if (!body.requestId || !body.action || !["accept", "reject"].includes(body.action)) return NextResponse.json({ error: "Invalid request action" }, { status: 400 })
  const admin = createAdminClient()
  const { data: friendRequest } = await admin.from("friend_requests").select("*").eq("id", body.requestId).eq("recipient_id", user.id).eq("status", "pending").maybeSingle()
  if (!friendRequest) return NextResponse.json({ error: "Pending request not found" }, { status: 404 })
  const status = body.action === "accept" ? "accepted" : "rejected"
  const { error } = await admin.from("friend_requests").update({ status, responded_at: new Date().toISOString() }).eq("id", friendRequest.id)
  if (error) return NextResponse.json({ error: "Failed to update friend request" }, { status: 500 })
  let conversationId: string | null = null
  if (status === "accepted") {
    const [user1Id, user2Id] = [friendRequest.requester_id, friendRequest.recipient_id].sort()
    const { data: existing } = await admin.from("conversations").select("id").eq("user1_id", user1Id).eq("user2_id", user2Id).eq("type", "dm").maybeSingle()
    if (existing) conversationId = existing.id
    else {
      const { data: created, error: createError } = await admin.from("conversations").insert({ user1_id: user1Id, user2_id: user2Id, type: "dm" }).select("id").single()
      if (createError) return NextResponse.json({ error: "Friend accepted but chat creation failed" }, { status: 500 })
      conversationId = created.id
    }
  }
  return NextResponse.json({ success: true, status, conversationId })
}

export async function DELETE(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Body
  if (!body.requestId) return NextResponse.json({ error: "Friendship is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: friendship } = await admin
    .from("friend_requests")
    .select("id, requester_id, status")
    .eq("id", body.requestId)
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .maybeSingle()

  if (!friendship || (friendship.status === "pending" && friendship.requester_id !== user.id) || !["accepted", "pending"].includes(friendship.status)) {
    return NextResponse.json({ error: "Friendship or sent request not found" }, { status: 404 })
  }

  const { error } = await admin.from("friend_requests").delete().eq("id", friendship.id)
  if (error) return NextResponse.json({ error: friendship.status === "pending" ? "Failed to cancel request" : "Failed to remove friend" }, { status: 500 })
  return NextResponse.json({ success: true })
}
