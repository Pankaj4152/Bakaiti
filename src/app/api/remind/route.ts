import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const { userId, createdBy, text, remindAt } = await request.json()
  if (!userId || !createdBy || !text || !remindAt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("reminders")
    .insert({ user_id: userId, created_by: createdBy, text, remind_at: remindAt })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reminder: data })
}
