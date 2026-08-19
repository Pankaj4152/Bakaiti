import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

const DELETE_WINDOW_MS = 60_000

function storagePath(url: string | null, bucket: string) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length).split("?")[0])
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { messageId } = await params
  const admin = createAdminClient()
  const { data: message } = await admin.from("messages").select("id, sender_id, created_at, image_url, audio_url").eq("id", messageId).maybeSingle()
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  if (message.sender_id !== user.id) return NextResponse.json({ error: "You can only delete your own message" }, { status: 403 })

  const ageMs = Date.now() - new Date(message.created_at).getTime()
  if (ageMs < 0 || ageMs > DELETE_WINDOW_MS) return NextResponse.json({ error: "Messages can only be deleted within one minute" }, { status: 410 })

  const { error } = await admin.from("messages").delete().eq("id", message.id).eq("sender_id", user.id)
  if (error) return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })

  const imagePath = storagePath(message.image_url, "images")
  const audioPath = storagePath(message.audio_url, "audio")
  if (imagePath) await admin.storage.from("images").remove([imagePath])
  if (audioPath) await admin.storage.from("audio").remove([audioPath])
  return NextResponse.json({ success: true })
}
