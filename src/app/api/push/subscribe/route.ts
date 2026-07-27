import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getVapidPublicKey } from "@/lib/web-push"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data: profile } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const { endpoint, keys } = await request.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing endpoint or keys" }, { status: 400 })
  }

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: profile.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint", ignoreDuplicates: false }
  )

  return NextResponse.json({ success: true })
}

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() })
}
