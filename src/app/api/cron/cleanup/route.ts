import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { log } from "@/lib/logger"

export async function GET(request: Request) {
  // Verify Cron authorization secret if configured
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    log.info("CRON_CLEANUP", "Unauthorized cron invocation attempt")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    log.info("CRON_CLEANUP", "Starting 30-day message and media purge...")

    // 1. Find media files attached to messages older than 30 days before deleting rows
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: oldMediaMessages } = await admin
      .from("messages")
      .select("id, image_url, audio_url")
      .lt("created_at", thirtyDaysAgo)
      .or("image_url.neq.null,audio_url.neq.null")

    let deletedMediaCount = 0

    if (oldMediaMessages && oldMediaMessages.length > 0) {
      const imagePaths: string[] = []
      const audioPaths: string[] = []

      for (const msg of oldMediaMessages) {
        if (msg.image_url) {
          const path = msg.image_url.split("/storage/v1/object/public/images/")[1]
          if (path) imagePaths.push(path)
        }
        if (msg.audio_url) {
          const path = msg.audio_url.split("/storage/v1/object/public/audio/")[1]
          if (path) audioPaths.push(path)
        }
      }

      if (imagePaths.length > 0) {
        const { error } = await admin.storage.from("images").remove(imagePaths)
        if (!error) deletedMediaCount += imagePaths.length
      }

      if (audioPaths.length > 0) {
        const { error } = await admin.storage.from("audio").remove(audioPaths)
        if (!error) deletedMediaCount += audioPaths.length
      }
    }

    // 2. Run RPC function or direct delete for messages older than 30 days
    const { count: deletedMessagesCount, error: deleteError } = await admin
      .from("messages")
      .delete({ count: "exact" })
      .lt("created_at", thirtyDaysAgo)

    if (deleteError) {
      log.error("CRON_CLEANUP", "Error deleting old messages:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 3. Clean up expired meme cooldowns
    await admin
      .from("meme_cooldowns")
      .delete()
      .lt("next_allowed_at", new Date().toISOString())

    log.info("CRON_CLEANUP", `Successfully purged ${deletedMessagesCount ?? 0} messages and ${deletedMediaCount} media files older than 30 days`)

    return NextResponse.json({
      success: true,
      deletedMessagesCount: deletedMessagesCount ?? 0,
      deletedMediaCount,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    log.error("CRON_CLEANUP", "Unexpected error during cleanup:", err)
    return NextResponse.json({ error: err.message ?? "Cleanup failed" }, { status: 500 })
  }
}
