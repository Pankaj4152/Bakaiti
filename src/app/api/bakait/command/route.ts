import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateRoast } from "@/lib/gemini"
import { getAuthUser, isConversationMember, getConversationUserMap } from "@/lib/auth"

const FUN_RESPONSES: Record<string, (targetName?: string, userNames?: string[]) => string> = {
  "/callbhabhi": (target) =>
    `Hey ${target ?? "there"}! Sitting around on your phone all day with no real work? Talking about being "busy" but posting stories every 5 minutes! 😂`,

  "/fortune": () => {
    const fortunes = [
      "Your luck today: someone will say 'let's do it tomorrow' and then vanish 🔮",
      "You will receive a message saying 'yes bro for sure' and tomorrow it'll be the same story ✨",
      "Today is auspicious: someone will read your message and fall asleep without replying 🌟",
      "Warning! Someone will say 'be there in 5' and show up 3 hours later ⚡",
      "Your horoscope says today will be filled with 'ok' and 'k' replies 🔮",
      "Soon you will receive unsolicited advice from someone who hasn't done anything themselves 😌",
      "Historic day! Someone will tell you how to start a startup (while having 0 followers themselves) 🚀",
    ]
    return fortunes[Math.floor(Math.random() * fortunes.length)]
  },


}

const AI_PROMPTS: Record<string, string> = {
  "/ghost-meter": `You are a ghosting analyst. Analyze the conversation for who: takes longest to reply, leaves on read the most, texts "ok" or "k" the most, and who sends the longest texts. Create a funny leaderboard. Keep it under 5 lines. Return ONLY the leaderboard.`,

  "/simps": `You are a relationship analyst for this chat. Determine who replies fastest to whom, who starts conversations the most, and who seems most eager. Create a funny "Simp Leaderboard". Keep it under 5 lines.`,

  "/mood": `Analyze the mood of this conversation. Is everyone happy, irritated, excited, bored, chaotic? Give a one-line summary with a fun analogy.`,
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const command = body.command as string | undefined
  const conversationId = body.conversationId as string | undefined
  const targetUserId = body.targetUserId as string | undefined
  if (!command || !conversationId) {
    return NextResponse.json({ error: "Missing command or conversationId" }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: convo } = await admin
    .from("conversations")
    .select("id, type, user1_id, user2_id")
    .eq("id", conversationId)
    .single()

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const { userIdToName, userNames } = await getConversationUserMap(conversationId, convo)

  // Get recent messages for context
  const { data: messages } = await admin
    .from("messages")
    .select("content, audio_url, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50)

  const chatLog = (messages ?? []).reverse().map((m) => {
    const name = userIdToName[m.sender_id] ?? "Unknown"
    return `[${name}]: ${m.content ?? "🎤 Voice message"}`
  }).join("\n")

  const targetName = targetUserId ? userIdToName[targetUserId] : undefined

  // Handle fun commands with static responses
  if (FUN_RESPONSES[command]) {
    const response = FUN_RESPONSES[command](targetName, userNames)
    return NextResponse.json({ response })
  }

  // Handle AI prompts
  const promptTemplate = AI_PROMPTS[command]
  if (!promptTemplate) {
    return NextResponse.json({ error: "Unknown command" }, { status: 400 })
  }

  const prompt = promptTemplate.replace("{target}", targetName ?? "they")
  const fullPrompt = `Here is the conversation:\n${chatLog}\n\n${prompt}`

  const API_KEY = process.env.GEMINI_API_KEY
  if (!API_KEY) return NextResponse.json({ error: "Gemini not configured" }, { status: 500 })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
    }
  )

  if (!res.ok) return NextResponse.json({ error: "AI failed" }, { status: 500 })

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return NextResponse.json({ error: "AI returned empty" }, { status: 500 })

  return NextResponse.json({ response: text.trim() })
}