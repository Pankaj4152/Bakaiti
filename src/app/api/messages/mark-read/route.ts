import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const { conversationId } = await request.json()
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data: profile } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", profile.id)
    .eq("read", false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
