import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const pollId = body.pollId as string | undefined
  const optionId = body.optionId as string | undefined
  if (!pollId || !optionId) {
    return NextResponse.json({ error: "Missing pollId or optionId" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const supabase = await createClient()

  // Verify the option actually belongs to this poll (prevents cross-poll votes).
  const { data: option } = await supabase
    .from("poll_options")
    .select("id")
    .eq("id", optionId)
    .eq("poll_id", pollId)
    .maybeSingle()

  if (!option) {
    return NextResponse.json({ error: "Poll option not found" }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from("poll_votes")
    .select("id, option_id")
    .eq("option_id", optionId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing) {
    // Same option clicked again → toggle the vote off.
    await supabase.from("poll_votes").delete().eq("id", existing.id)
    return NextResponse.json({ voted: false })
  }

  // User has voted elsewhere in this poll → move the vote.
  const { data: pollOptions } = await supabase
    .from("poll_options")
    .select("id")
    .eq("poll_id", pollId)
  const pollOptionIds = (pollOptions ?? []).map((o) => o.id)

  const { data: otherVote } = await supabase
    .from("poll_votes")
    .select("id")
    .eq("user_id", user.id)
    .in("option_id", pollOptionIds)
    .maybeSingle()

  if (otherVote) {
    await supabase.from("poll_votes").delete().eq("id", otherVote.id)
  }

  await supabase.from("poll_votes").insert({ option_id: optionId, user_id: user.id })
  return NextResponse.json({ voted: true })
}