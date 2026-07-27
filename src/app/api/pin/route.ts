import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { conversationId, messageId } = await request.json()
  if (!conversationId || !messageId) {
    return NextResponse.json({ error: "Missing conversationId or messageId" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const { error } = await admin
    .from("pinned_messages")
    .insert({ conversation_id: conversationId, message_id: messageId, pinned_by: profile.id })

  if (error?.message?.includes("duplicate")) {
    return NextResponse.json({ alreadyPinned: true })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const url = new URL(request.url)
  const messageId = url.searchParams.get("messageId")
  if (!messageId) return NextResponse.json({ error: "Missing messageId" }, { status: 400 })

  const admin = createAdminClient()

  const { error } = await admin
    .from("pinned_messages")
    .delete()
    .eq("message_id", messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const conversationId = url.searchParams.get("conversationId")
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("pinned_messages")
    .select("id, message_id, created_at, pinned_by")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pins: data ?? [] })
}
