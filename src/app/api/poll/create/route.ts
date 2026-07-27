import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const { conversationId, question, options } = await request.json()
  if (!conversationId || !question || !options || options.length < 2) {
    return NextResponse.json({ error: "Need conversationId, question, and at least 2 options" }, { status: 400 })
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

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({ conversation_id: conversationId, question, created_by: profile.id })
    .select()
    .single()

  if (pollError || !poll) return NextResponse.json({ error: "Failed to create poll" }, { status: 500 })

  const pollOptions = options.map((text: string) => ({ poll_id: poll.id, text }))
  const { error: optError } = await supabase.from("poll_options").insert(pollOptions)
  if (optError) return NextResponse.json({ error: "Failed to create options" }, { status: 500 })

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: profile.id,
    content: `📊 Poll: ${question}`,
    poll_id: poll.id,
  })

  return NextResponse.json({ poll })
}
