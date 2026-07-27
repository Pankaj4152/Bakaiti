import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeDay } from "@/lib/gemini"

async function runScan() {
  const admin = createAdminClient()

  const { data: conversations } = await admin.from("conversations").select("id, user1_id, user2_id")
  if (!conversations) return NextResponse.json({ ok: true, processed: 0 })

  // Get all user names for mapping
  const { data: allUsers } = await admin.from("allowed_users").select("id, name")
  const userIdToName: Record<string, string> = {}
  const userNameToId: Record<string, string> = {}
  if (allUsers) for (const u of allUsers) {
    userIdToName[u.id] = u.name
    userNameToId[u.name] = u.id
  }

  let totalProcessed = 0

  for (const convo of conversations) {
    const userNames = [userIdToName[convo.user1_id], userIdToName[convo.user2_id]].filter(Boolean)

    // Get last processed state
    const { data: state } = await admin
      .from("daily_processing_state")
      .select("last_processed_message_id, last_processed_date")
      .eq("conversation_id", convo.id)
      .maybeSingle()

    // Fetch messages since last processed
    let query = admin
      .from("messages")
      .select("id, content, audio_url, sender_id, created_at")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true })

    if (state?.last_processed_message_id) {
      query = query.gt("id", state.last_processed_message_id)
    }

    const { data: messages } = await query
    if (!messages || messages.length === 0) continue

    // Group by date
    const byDate: Record<string, typeof messages> = {}
    for (const msg of messages) {
      const date = msg.created_at.split("T")[0]
      if (!byDate[date]) byDate[date] = []
      byDate[date].push(msg)
    }

    let lastMessageId = messages[messages.length - 1].id
    let lastProcessedDate = state?.last_processed_date ?? null

    for (const [date, dayMsgs] of Object.entries(byDate)) {
      if (dayMsgs.length < 3) continue

      const messageInputs = dayMsgs.map((m) => ({
        sender_name: userIdToName[m.sender_id] ?? "Unknown",
        content: m.content ?? "🎤 Voice message",
        created_at: m.created_at,
      }))

      const result = await analyzeDay(messageInputs, date, userNames, userNameToId)

      // Save daily summary
      if (result.summary) {
        await admin.from("daily_summaries").upsert(
          {
            conversation_id: convo.id,
            date,
            content: result.summary,
          },
          { onConflict: "conversation_id,date", ignoreDuplicates: false }
        )
      }

      // Save memories
      for (const mem of result.memories) {
        if (!mem.target_user_id || mem.confidence < 0.7) continue
        const { data: existing } = await admin
          .from("memories")
          .select("id")
          .eq("conversation_id", convo.id)
          .eq("target_user_id", mem.target_user_id)
          .eq("type", mem.type)
          .ilike("content", mem.content)
          .maybeSingle()

        if (!existing) {
          await admin.from("memories").insert({
            conversation_id: convo.id,
            target_user_id: mem.target_user_id,
            type: mem.type,
            content: mem.content,
            context: mem.context || null,
            confidence: mem.confidence,
          })
        }
      }

      // Save legendary quotes
      for (const q of result.legendary_quotes) {
        if (!q.user_id) continue
        const { data: existing } = await admin
          .from("legendary_quotes")
          .select("id")
          .eq("user_id", q.user_id)
          .ilike("quote", q.quote)
          .maybeSingle()

        if (!existing) {
          await admin.from("legendary_quotes").insert({
            user_id: q.user_id,
            quote: q.quote,
            context: q.context || null,
          })
        }
      }

      lastProcessedDate = date
      totalProcessed++
    }

    // Update processing state
    await admin.from("daily_processing_state").upsert(
      {
        conversation_id: convo.id,
        last_processed_message_id: lastMessageId,
        last_processed_date: lastProcessedDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id", ignoreDuplicates: false }
    )
  }

  return NextResponse.json({ ok: true, daysProcessed: totalProcessed })
}

export async function POST() {
  return runScan()
}

export async function GET() {
  return runScan()
}
