import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ reminders: [] })
  }

  const admin = createAdminClient()

  const { data: currentUser } = await admin
    .from("allowed_users")
    .select("id, name")
    .eq("email", user.email)
    .maybeSingle()

  if (!currentUser) {
    return NextResponse.json({ reminders: [] })
  }

  const { data: reminders } = await admin
    .from("reminders")
    .select("id, text, remind_at, created_by")
    .eq("user_id", currentUser.id)
    .eq("notified", false)
    .lte("remind_at", new Date().toISOString())
    .limit(10)

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ reminders: [] })
  }

  const reminderIds = reminders.map((r) => r.id)

  await admin
    .from("reminders")
    .update({ notified: true })
    .in("id", reminderIds)

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
