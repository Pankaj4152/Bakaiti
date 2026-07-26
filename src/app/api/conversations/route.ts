import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data: profile } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ data: [] })

  const myId = profile.id
  const admin = createAdminClient()

  const { data: rows, error } = await admin.rpc("get_conversation_list", { my_user_id: myId })

  if (!error && rows) {
    return NextResponse.json({ data: rows })
  }

  // Fallback: direct queries if the RPC function hasn't been created yet
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
    .order("last_message_at", { ascending: false })

  if (!conversations || conversations.length === 0) return NextResponse.json({ data: [] })

  const otherIds = [...new Set(conversations.map((c) => (c.user1_id === myId ? c.user2_id : c.user1_id)))]
  const convoIds = conversations.map((c) => c.id)

  const [{ data: otherUsers }, ...results] = await Promise.all([
    supabase.from("allowed_users").select("id, name, username, avatar_url").in("id", otherIds),
    ...convoIds.flatMap((cid) => [
      supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => ({ cid, lastMsg: r.data })),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", cid)
        .eq("read", false)
        .neq("sender_id", myId)
        .then((r) => ({ cid, unread: r.count ?? 0 })),
    ]),
  ])

  const otherUserMap: Record<string, any> = {}
  if (otherUsers) for (const u of otherUsers) otherUserMap[u.id] = u

  const lastMsgMap: Record<string, any> = {}
  const unreadMap: Record<string, number> = {}
  for (const r of results) {
    if ("lastMsg" in r) lastMsgMap[r.cid] = r.lastMsg
    else unreadMap[r.cid] = r.unread
  }

  const list = conversations.map((convo) => {
    const otherId = convo.user1_id === myId ? convo.user2_id : convo.user1_id
    const lastMsg = lastMsgMap[convo.id] ?? null
    return {
      id: convo.id,
      otherUser: otherUserMap[otherId] ?? null,
      lastMessage: lastMsg
        ? { content: lastMsg.content, created_at: lastMsg.created_at, isMine: lastMsg.sender_id === myId }
        : null,
      unreadCount: unreadMap[convo.id] ?? 0,
    }
  })

  return NextResponse.json({ data: list })
}
