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

  const enriched = await enrichWithSenderNames(rows)
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