import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ reminders: [] })
  }

  const admin = createAdminClient()

  // Atomically claim due reminders (UPDATE ... WHERE notified = false RETURNING)
  // so concurrent polls never deliver the same reminder twice.
  const { data: reminders, error } = await admin
    .from("reminders")
    .update({ notified: true })
    .eq("user_id", user.id)
    .eq("notified", false)
    .lte("remind_at", new Date().toISOString())
    .select("id, text, remind_at, created_by")
    .limit(10)

  if (error || !reminders || reminders.length === 0) {
    return NextResponse.json({ reminders: [] })
  }

  const { data: creatorNames } = await admin
    .from("allowed_users")
    .select("id, name")
    .in("id", reminders.map((r) => r.created_by))

  const nameMap: Record<string, string> = {}
  if (creatorNames) for (const c of creatorNames) nameMap[c.id] = c.name

  const result = reminders.map((r) => ({
    id: r.id,
    text: r.text,
    remind_at: r.remind_at,
    created_by_name: nameMap[r.created_by] ?? "Someone",
  }))

  return NextResponse.json({ reminders: result })
}