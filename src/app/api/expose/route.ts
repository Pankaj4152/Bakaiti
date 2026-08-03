import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser, isConversationMember } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const conversationId = body.conversationId as string | undefined
  const targetUserId = body.targetUserId as string | undefined
  if (!conversationId || !targetUserId) {
    return NextResponse.json({ error: "Missing conversationId or targetUserId" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: targetUser } = await admin
    .from("allowed_users")
    .select("id, name")
    .eq("id", targetUserId)
    .single()

  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const { data: messages } = await admin
    .from("messages")
    .select("content, audio_url, created_at")
    .eq("conversation_id", conversationId)
    .eq("sender_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages from this user yet" }, { status: 400 })
  }

  const recentMessages = messages.reverse().map((m) => ({
    content: m.content ?? null,
    created_at: m.created_at,
  }))

  const API_KEY = process.env.GEMINI_API_KEY
  if (!API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 500 })

  const chatLog = recentMessages
    .map((m) => `[${m.created_at}]: ${m.content ?? "(voice message)"}`)
    .join("\n")

  const prompt = `You are an AI comedian hosting a "roast night" for a group chat. Your job is to find the most embarrassing, funny, or ridiculous message sent by "${targetUser.name}" and dramatically expose it.

Here are their recent messages:
${chatLog}

Pick the single most embarrassing/funny/cringe message. Then write a DRAMATIC reading of it — like a reality TV narrator exposing a contestant's secret. Include:
1. A dramatic buildup/context
2. The exact message quoted
3. Why it's so funny/embarrassing
4. A savage but playful punchline

Keep it under 4 sentences. Be hilarious but not mean. Return ONLY the dramatic expose text, no explanations or markdown.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 })
  }

  const data = await res.json()
  const expose = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!expose) {
    return NextResponse.json({ error: "Failed to generate expose" }, { status: 500 })
  }

  return NextResponse.json({ expose, targetName: targetUser.name })
}