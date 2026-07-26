import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from("allowed_users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle()

  return NextResponse.json({ data: { allowed: !!data } })
}
