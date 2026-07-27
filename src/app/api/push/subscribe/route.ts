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

  const { endpoint, keys, userId: bodyUserId } = body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing endpoint or keys" }, { status: 400 })
  }

  let targetUserId: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from("allowed_users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle()
      targetUserId = profile?.id ?? null
    }
  } catch {}

  if (!targetUserId && bodyUserId) {
    targetUserId = bodyUserId
  }

  if (!targetUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error: upsertError } = await admin.from("push_subscriptions").upsert(
    {
      user_id: targetUserId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint", ignoreDuplicates: false }
  )

  if (upsertError) {
    console.error("Push subscription upsert error:", upsertError)
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() })
}

