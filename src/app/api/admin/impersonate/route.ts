import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const cookieStore = await cookies()
  const impersonateId = cookieStore.get("bakaiti_impersonate_id")?.value

  if (!impersonateId) {
    return NextResponse.json({ impersonating: false, targetUser: null })
  }

  const admin = createAdminClient()
  const { data: user } = await admin
    .from("allowed_users")
    .select("id, name, username, avatar_url")
    .eq("id", impersonateId)
    .maybeSingle()

  return NextResponse.json({
    impersonating: true,
    targetUser: user ?? null,
  })
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const adminToken = cookieStore.get("bakaiti_admin_token")?.value

    if (adminToken !== "secret_admin_session_granted") {
      return NextResponse.json({ error: "Admin session required for impersonation" }, { status: 401 })
    }

    const { targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 })
    }

    cookieStore.set("bakaiti_impersonate_id", targetUserId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 86400, // 24 hours
    })

    return NextResponse.json({ success: true, targetUserId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to set impersonation" }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("bakaiti_impersonate_id")
  return NextResponse.json({ success: true })
}
