import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  // Only allow checking the caller's own email to prevent enumeration of the member directory.
  const cleanEmail = email.toLowerCase().trim()
  if (cleanEmail !== user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  const adminDb = createAdminClient()
  const { data } = await adminDb
    .from("allowed_users")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle()

  return NextResponse.json({ data: { allowed: !!data } })
}