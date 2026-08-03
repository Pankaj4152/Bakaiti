import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { translateText } from "@/lib/gemini"

const VALID_LANGUAGES = new Set([
  "English", "Hindi", "Spanish", "French", "German", "Japanese", "Korean",
  "Chinese", "Arabic", "Portuguese", "Russian", "Italian", "Tamil", "Telugu",
  "Bengali", "Marathi", "Gujarati", "Punjabi",
])

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  let body: { text?: unknown; language?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { text, language } = body
  if (typeof text !== "string" || !text.trim() || text.trim().length > 2000) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 })
  }
  if (typeof language !== "string" || !VALID_LANGUAGES.has(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 })
  }

  const translated = await translateText(text.trim(), language)
  if (!translated) {
    return NextResponse.json({ error: "Translation failed" }, { status: 502 })
  }

  return NextResponse.json({ translated })
}