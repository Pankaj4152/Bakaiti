import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeDay } from "@/lib/gemini"
import { log } from "@/lib/logger"

const CRON_SECRET = process.env.CRON_SECRET

// Only allow the Vercel cron (x-vercel-cron header) or the configured CRON_SECRET.
function isAuthorized(request: Request): boolean {
  if (request.headers.get("x-vercel-cron") === "1") return true
  const secret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return !!CRON_SECRET && secret === CRON_SECRET
}

// Acquire an advisory lock so two concurrent runs never double-process.
async function acquireLock(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.rpc("try_bakaiti_scan_lock", { lock_key: 727272 })
  return data === true
}

async function releaseLock(admin: ReturnType<typeof createAdminClient>) {
  await admin.rpc("release_bakaiti_scan_lock", { lock_key: 727272 })
}

async function runScan(): Promise<NextResponse> {
  const admin = createAdminClient()

  const locked = await acquireLock(admin)
  if (!locked) {
    return NextResponse.json({ ok: true, processed: 0, locked: true })
  }

  try {
    const { data: conversations, error: convoError } = await admin.from("conversations").select("id, user1_id, user2_id")
    if (convoError) {
      log.error("SCAN", "Failed to load conversations", convoError.message)
      return NextResponse.json({ ok: false, error: "Scan failed" }, { status: 500 })
    }
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
      // Per-conversation error isolation: one failure never aborts the whole scan.
      try {
        const userNames = [userIdToName[convo.user1_id], userIdToName[convo.user2_id]].filter(Boolean)

        // Get last processed state
        const { data: state } = await admin
          .from("daily_processing_state")
          .select("last_processed_message_id, last_processed_date, last_processed_at")
          .eq("conversation_id", convo.id)
          .maybeSingle()

        // Fetch messages since last processed. We use a created_at watermark, NOT
        // a UUID comparison (UUIDs are random and half of new rows would be skipped).
        let query = admin
          .from("messages")
          .select("id, content, audio_url, sender_id, created_at")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: true })

        if (state?.last_processed_at) {
          query = query.gt("created_at", state.last_processed_at)
        }

        const { data: messages, error: msgError } = await query
        if (msgError) {
          log.error("SCAN", "Failed to load messages", convo.id, msgError.message)
          continue
        }
        if (!messages || messages.length === 0) continue

        // Group by date (UTC date is fine for daily summaries)
        const byDate: Record<string, typeof messages> = {}
        for (const msg of messages) {
          const date = msg.created_at.split("T")[0]
          if (!byDate[date]) byDate[date] = []
          byDate[date].push(msg)
        }

        let lastMessageAt = messages[messages.length - 1].created_at
        let lastProcessedDate = state?.last_processed_date ?? null

        for (const [date, dayMsgs] of Object.entries(byDate)) {
          if (dayMsgs.length < 3) continue

          const messageInputs = dayMsgs.map((m) => ({
            sender_name: userIdToName[m.sender_id] ?? "Unknown",
            content: m.content ?? "🎤 Voice message",
            created_at: m.created_at,
          }))

          let result
          try {
            result = await analyzeDay(messageInputs, date, userNames, userNameToId)
          } catch (e) {
            log.error("SCAN", "analyzeDay failed", convo.id, date, (e as Error).message)
            continue
          }

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

        // Update processing state with the created_at watermark
        await admin.from("daily_processing_state").upsert(
          {
            conversation_id: convo.id,
            last_processed_message_id: messages[messages.length - 1].id,
            last_processed_at: lastMessageAt,
            last_processed_date: lastProcessedDate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id", ignoreDuplicates: false }
        )
      } catch (e) {
        log.error("SCAN", "Conversation scan failed", convo.id, (e as Error).message)
      }
    }

    return NextResponse.json({ ok: true, daysProcessed: totalProcessed })
  } finally {
    await releaseLock(admin)
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return runScan()
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return runScan()
}
