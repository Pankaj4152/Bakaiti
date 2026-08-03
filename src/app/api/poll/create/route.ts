import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser, isConversationMember } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const conversationId = body.conversationId as string | undefined
  const question = body.question as string | undefined
  const options = body.options as string[] | undefined
  if (!conversationId || !question || !options || options.length < 2) {
    return NextResponse.json({ error: "Need conversationId, question, and at least 2 options" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const supabase = await createClient()

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({ conversation_id: conversationId, question, created_by: user.id })
    .select()
    .single()

  if (pollError || !poll) return NextResponse.json({ error: "Failed to create poll" }, { status: 500 })

  const pollOptions = options.map((text: string) => ({ poll_id: poll.id, text }))
  const { error: optError } = await supabase.from("poll_options").insert(pollOptions)
  if (optError) return NextResponse.json({ error: "Failed to create options" }, { status: 500 })

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: `📊 Poll: ${question}`,
    poll_id: poll.id,
  })

  return NextResponse.json({ poll })
}