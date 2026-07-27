import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { webPush } from "@/lib/web-push"

export async function POST(request: Request) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Handle both direct client call and Supabase DB Webhook payload
  let conversationId: string | undefined = body.conversationId
  let senderId: string | undefined = body.senderId
  let content: string | undefined = body.content

  if (!conversationId && body.record) {
    conversationId = body.record.conversation_id
    senderId = body.record.sender_id
    content = body.record.content || (body.record.audio_url ? "🎤 Voice message" : "Sent a message")
  }

  if (!conversationId || !senderId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Find conversation details
  const { data: convo } = await admin
    .from("conversations")
    .select("id, type, name, user1_id, user2_id")
    .eq("id", conversationId)
    .maybeSingle()

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  // 2. Identify target recipient user IDs (DM or Group)
  let recipientUserIds: string[] = []

  if (convo.type === "group") {
    const { data: participants } = await admin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId)

    recipientUserIds = (participants || []).map((p) => p.user_id)
  } else {
    const otherId = convo.user1_id === senderId ? convo.user2_id : convo.user1_id
    if (otherId) recipientUserIds = [otherId]
  }

  if (recipientUserIds.length === 0) return NextResponse.json({ sent: 0 })

  // 3. Get sender details
  const { data: sender } = await admin
    .from("allowed_users")
    .select("name")
    .eq("id", senderId)
    .maybeSingle()

  const senderName = sender?.name ?? "Someone"
  const title = convo.type === "group" && convo.name ? `${senderName} (${convo.name})` : senderName

  // 4. Fetch push subscriptions for all recipients
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .in("user_id", recipientUserIds)

  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({
    title,
    body: (content ?? "New message").slice(0, 100),
    url: `/chat/${convo.type === "group" ? `group/${conversationId}` : senderId}`,
  })

  let sent = 0
  const expiredEndpoints: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: any) {
        // Status 404 or 410 means subscription expired/unregistered
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint)
        }
      }
    })
  )

  // 5. Clean up expired subscriptions automatically
  if (expiredEndpoints.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints)
  }

  return NextResponse.json({ sent, cleaned: expiredEndpoints.length })
}

