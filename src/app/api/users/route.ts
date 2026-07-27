import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const admin = createAdminClient()

  const { data: users } = await admin
    .from("allowed_users")
    .select("id, name, username, avatar_url")
    .eq("status", "approved")
    .order("name")

  return NextResponse.json({ users: users ?? [] })
}
