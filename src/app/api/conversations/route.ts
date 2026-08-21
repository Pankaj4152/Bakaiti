import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  const { data: rows, error } = await admin.rpc("get_conversation_list", { my_user_id: user.id })

  if (error) {
    return NextResponse.json({ data: [], error: "RPC unavailable" }, { status: 200 })
  }

  if (!rows) return NextResponse.json({ data: [] })

  const [{ data: archived }, { data: deleted }, { data: friendRequests }] = await Promise.all([
    admin.from("archived_conversations").select("conversation_id, archived_at").eq("user_id", user.id),
    admin.from("deleted_conversations").select("conversation_id, deleted_at").eq("user_id", user.id),
    admin.from("friend_requests").select("requester_id, recipient_id, requester:allowed_users!requester_id(id, name, username, avatar_url, last_seen), recipient:allowed_users!recipient_id(id, name, username, avatar_url, last_seen)").eq("status", "accepted").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
  ])
  const archivedAt = new Map((archived ?? []).map((item) => [item.conversation_id, new Date(item.archived_at).getTime()]))
  const deletedAt = new Map((deleted ?? []).map((item) => [item.conversation_id, new Date(item.deleted_at).getTime()]))
  
  const processedRows: any[] = []
  const existingOtherUserIds = new Set<string>()

  for (const row of rows) {
    const hiddenAt = Math.max(archivedAt.get(row.id) ?? 0, deletedAt.get(row.id) ?? 0)
    const latestAt = row.lastMessage?.created_at ? new Date(row.lastMessage.created_at).getTime() : 0

    if (row.otherUser?.id) existingOtherUserIds.add(row.otherUser.id)

    if (hiddenAt && latestAt <= hiddenAt) {
      if (row.type === "group") {
        // Hide groups if deleted/archived and no new messages
        continue
      }
      // For DMs, keep the user in sidebar with cleared lastMessage
      processedRows.push({
        ...row,
        lastMessage: null,
        unreadCount: 0,
      })
    } else {
      processedRows.push(row)
    }
  }

  // Ensure all accepted friends appear in the conversation list
  if (friendRequests) {
    for (const fr of friendRequests) {
      const friend = fr.requester_id === user.id ? fr.recipient : fr.requester
      if (friend && !existingOtherUserIds.has(friend.id)) {
        existingOtherUserIds.add(friend.id)
        processedRows.push({
          id: `friend-${friend.id}`,
          type: "dm",
          name: friend.name,
          otherUser: friend,
          lastMessage: null,
          unreadCount: 0,
          created_at: new Date().toISOString(),
        })
      }
    }
  }

  const enriched = await enrichWithSenderNames(processedRows)
  return NextResponse.json({ data: enriched })
}

async function enrichWithSenderNames(rows: any[]): Promise<any[]> {
  const admin = createAdminClient()
  const senderIds = new Set<string>()
  for (const r of rows) {
    if (r.lastMessage && r.lastMessage.sender_id) senderIds.add(r.lastMessage.sender_id)
  }
  if (senderIds.size === 0) return rows

  const { data: senders } = await admin
    .from("allowed_users")
    .select("id, name")
    .in("id", [...senderIds])

  const senderMap: Record<string, string> = {}
  if (senders) for (const s of senders) senderMap[s.id] = s.name

  return rows.map((r) => ({
    ...r,
    lastMessage: r.lastMessage
      ? { ...r.lastMessage, senderName: r.lastMessage.sender_id ? senderMap[r.lastMessage.sender_id] ?? null : null }
      : null,
  }))
}
