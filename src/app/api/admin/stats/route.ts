import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const [
    { count: totalUsers },
    { count: approvedUsers },
    { count: pendingUsers },
    { count: blockedUsers },
    { count: totalMessages },
    { count: totalConversations },
  ] = await Promise.all([
    admin.from("allowed_users").select("*", { count: "exact", head: true }),
    admin.from("allowed_users").select("*", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("allowed_users").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("allowed_users").select("*", { count: "exact", head: true }).eq("status", "blocked"),
    admin.from("messages").select("*", { count: "exact", head: true }),
    admin.from("conversations").select("*", { count: "exact", head: true }),
  ])

  // Count active online users (last_seen within last 5 minutes)
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count: activeOnline } = await admin
    .from("allowed_users")
    .select("*", { count: "exact", head: true })
    .gte("last_seen", fiveMinsAgo)

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    approvedUsers: approvedUsers ?? 0,
    pendingUsers: pendingUsers ?? 0,
    blockedUsers: blockedUsers ?? 0,
    totalMessages: totalMessages ?? 0,
    totalConversations: totalConversations ?? 0,
    activeOnline: activeOnline ?? 0,
    timestamp: new Date().toISOString(),
  })
}
