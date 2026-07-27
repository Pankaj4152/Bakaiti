import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { endpoint } = await request.json()
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)

  return NextResponse.json({ success: true })
}
