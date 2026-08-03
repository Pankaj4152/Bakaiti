import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVapidPublicKey } from "@/lib/web-push"

export async function POST(request: Request) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { endpoint, keys } = body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing endpoint or keys" }, { status: 400 })
  }

  // Resolve the authenticated user's profile — never trust a client-supplied userId.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("allowed_users")
    .select("id")
    .eq("email", user.email.toLowerCase().trim())
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  const { error: upsertError } = await admin.from("push_subscriptions").upsert(
    {
      user_id: profile.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint", ignoreDuplicates: false }
  )

  if (upsertError) {
    console.error("Push subscription upsert error:", upsertError)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() })
}