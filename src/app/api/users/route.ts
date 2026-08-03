import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  const { data: users } = await admin
    .from("allowed_users")
    .select("id, name, username, avatar_url")
    .eq("status", "approved")
    .order("name")

  return NextResponse.json({ users: users ?? [] })
}