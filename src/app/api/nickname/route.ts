import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const targetUserId = body.targetUserId as string | undefined
  const nickname = body.nickname as string | undefined
  if (!targetUserId || !nickname?.trim()) {
    return NextResponse.json({ error: "Missing targetUserId or nickname" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  const { error } = await admin
    .from("nicknames")
    .upsert(
      { user_id: user.id, target_user_id: targetUserId, nickname: nickname.trim().slice(0, 30) },
      { onConflict: "user_id,target_user_id" }
    )

  if (error) return NextResponse.json({ error: "Failed to save nickname" }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const url = new URL(request.url)
  const targetUserId = url.searchParams.get("targetUserId")

  const admin = createAdminClient()

  if (targetUserId) {
    // A single target → return one nickname (or null).
    const { data } = await admin
      .from("nicknames")
      .select("target_user_id, nickname")
      .eq("user_id", user.id)
      .eq("target_user_id", targetUserId)
      .maybeSingle()
    return NextResponse.json({ nickname: data ?? null })
  }

  // No target → return all of the caller's nicknames as a mapping.
  const { data } = await admin
    .from("nicknames")
    .select("target_user_id, nickname")
    .eq("user_id", user.id)

  return NextResponse.json({ nicknames: data ?? [] })
}