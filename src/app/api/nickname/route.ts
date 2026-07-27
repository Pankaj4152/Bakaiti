import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { targetUserId, nickname } = await request.json()
  if (!targetUserId || !nickname?.trim()) {
    return NextResponse.json({ error: "Missing targetUserId or nickname" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const { error } = await admin
    .from("nicknames")
    .upsert({ user_id: profile.id, target_user_id: targetUserId, nickname: nickname.trim() }, { onConflict: "user_id,target_user_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const url = new URL(request.url)
  const targetUserId = url.searchParams.get("targetUserId")

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  let query = admin.from("nicknames").select("target_user_id, nickname").eq("user_id", profile.id)
  if (targetUserId) query = query.eq("target_user_id", targetUserId)

  const { data, error } = await query.maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ nickname: data ?? null })
}
