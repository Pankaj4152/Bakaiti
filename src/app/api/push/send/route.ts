import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { webPush } from "@/lib/web-push"

export async function POST(request: Request) {
  const { conversationId, senderId, content } = await request.json()
  if (!conversationId || !senderId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  // Find the other user in the conversation
  const { data: convo } = await supabase
    .from("conversations")
    .select("user1_id, user2_id")
    .eq("id", conversationId)
    .maybeSingle()
  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const otherUserId = convo.user1_id === senderId ? convo.user2_id : convo.user1_id

  // Get sender name
  const { data: sender } = await supabase
    .from("allowed_users")
    .select("name")
    .eq("id", senderId)
    .maybeSingle()

  // Get the other user's push subscriptions
  const admin = createAdminClient()
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", otherUserId)

  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({
    title: sender?.name ?? "New message",
    body: content?.slice(0, 100) ?? "",
    url: `/chat/${senderId}`,
  })

  let sent = 0
  await Promise.allSettled(
    subs.map((sub) =>
      webPush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        .then(() => sent++)
        .catch(() => {})
    )
  )

  return NextResponse.json({ sent })
}
