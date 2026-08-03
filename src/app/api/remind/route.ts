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

  const userId = body.userId as string | undefined
  const text = body.text as string | undefined
  const remindAt = body.remindAt as string | undefined

  if (!userId || !text || !remindAt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // The creator is always the authenticated caller — never trust a body createdBy.
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const parsed = new Date(remindAt)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Remind time must be in the future" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("reminders")
    .insert({ user_id: userId, created_by: user.id, text, remind_at: parsed.toISOString() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 })
  }

  return NextResponse.json({ reminder: data })
}