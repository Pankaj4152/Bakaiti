import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

const API_KEY = process.env.GEMINI_API_KEY
const MODEL = "gemini-3.1-flash-lite"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { conversationId, targetUserId, targetUserName } = body
  if (!conversationId || !targetUserId) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  const authUser = await getAuthUser()
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  // Fetch recent messages sent by target user in this conversation
  const { data: messages } = await admin
    .from("messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .eq("sender_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(15)

  const sampleTexts = (messages ?? [])
    .map((m) => m.content)
    .filter(Boolean)
    .join("\n")

  const fallback = [
    `Canteen Chor ☕`,
    `Backbench Legend 😴`,
    `Mass Recruiter Target 🎯`,
  ]

  if (!API_KEY || sampleTexts.length < 5) {
    return NextResponse.json({ suggestions: fallback })
  }

  try {
    const prompt = `You are a hilarious Indian college student AI roaster on the messaging app Bakaiti.
Based on these recent chat messages from a college student named "${targetUserName ?? "Friend"}":

${sampleTexts}

Generate 3 hilarious, creative, roasting college nicknames tailored to their chat history and personality.
Each nickname must be 1 to 4 words with 1 relevant emoji at the end (e.g. "Padhaku Maggu 📚", "Late Latif ⏰", "Canteen Samosa ☕").
Return ONLY a valid JSON array of 3 strings, with no markdown formatting or extra text. Example: ["Name 1 ☕", "Name 2 😴", "Name 3 🎯"]`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
        }),
      }
    )

    if (res.ok) {
      const data = await res.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
      const parsed = JSON.parse(cleanJson)
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return NextResponse.json({ suggestions: parsed.slice(0, 3) })
      }
    }
  } catch (e: any) {
    console.error("AI Nickname Generation error:", e?.message)
  }

  return NextResponse.json({ suggestions: fallback })
}
