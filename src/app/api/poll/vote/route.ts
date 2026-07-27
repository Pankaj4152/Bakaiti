import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const { pollId, optionId } = await request.json()
  if (!pollId || !optionId) {
    return NextResponse.json({ error: "Missing pollId or optionId" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data: profile } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const { data: options } = await supabase
    .from("poll_options")
    .select("id")
    .eq("poll_id", pollId)

  if (!options || options.length === 0) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 })
  }

  const ids = options.map((o) => o.id)
  const { data: existing } = await supabase
    .from("poll_votes")
    .select("id, option_id")
    .in("option_id", ids)
    .eq("user_id", profile.id)
    .maybeSingle()

  if (existing) {
    if (existing.option_id === optionId) {
      await supabase.from("poll_votes").delete().eq("id", existing.id)
      return NextResponse.json({ voted: false })
    }
    await supabase.from("poll_votes").delete().eq("id", existing.id)
  }

  await supabase.from("poll_votes").insert({ option_id: optionId, user_id: profile.id })
  return NextResponse.json({ voted: true })
}
