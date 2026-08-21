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

  const { data: archived } = await admin
    .from("archived_conversations")
    .select("conversation_id, archived_at")
    .eq("user_id", user.id)
  const archivedAt = new Map((archived ?? []).map((item) => [item.conversation_id, new Date(item.archived_at).getTime()]))
  const visibleRows = rows.filter((row: any) => {
    const hiddenAt = archivedAt.get(row.id)
    if (!hiddenAt) return true
    const latestAt = row.lastMessage?.created_at ? new Date(row.lastMessage.created_at).getTime() : 0
    return latestAt > hiddenAt
  })
  const enriched = await enrichWithSenderNames(visibleRows)
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
