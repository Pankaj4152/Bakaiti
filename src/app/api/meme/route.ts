import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateMeme } from "@/lib/gemini"
import { renderMemeSVG } from "@/lib/meme-templates"
import { getAuthUser, isConversationMember } from "@/lib/auth"

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const conversationId = body.conversationId as string | undefined
  const userPrompt = body.userPrompt as string | undefined
  if (!conversationId) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  if (!(await isConversationMember(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a conversation member" }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: convo } = await admin
    .from("conversations")
    .select("user1_id, user2_id")
    .eq("id", conversationId)
    .single()

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const { data: allUsers } = await admin.from("allowed_users").select("id, name").in("id", [convo.user1_id, convo.user2_id])
  const userIdToName: Record<string, string> = {}
  const userNames: string[] = []
  if (allUsers) for (const u of allUsers) {
    userIdToName[u.id] = u.name
    userNames.push(u.name)
  }

  const { data: messages } = await admin
    .from("messages")
    .select("content, audio_url, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (!messages || messages.length < 3) {
    return NextResponse.json({ error: "Not enough messages for a meme yet" }, { status: 400 })
  }

  const recentMessages = messages.reverse().map((m) => ({
    sender_name: userIdToName[m.sender_id] ?? "Unknown",
    content: m.content ?? null,
    created_at: m.created_at,
  }))

  const memeText = await generateMeme(recentMessages, userNames, userPrompt)
  if (!memeText) {
    return NextResponse.json({ error: "Failed to generate meme" }, { status: 500 })
  }

  const svg = await renderMemeSVG(memeText.topText, memeText.bottomText)
  const svgBuffer = Buffer.from(svg, "utf-8")
  const fileName = `memes/${conversationId}/${Date.now()}.svg`

  const { error: uploadError } = await admin.storage.from("images").upload(fileName, svgBuffer, {
    contentType: "image/svg+xml",
    upsert: false,
  })

  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload meme" }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from("images").getPublicUrl(fileName)

  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: `${memeText.topText} | ${memeText.bottomText}`,
    image_url: publicUrl,
    is_ai: true,
  })

  return NextResponse.json({ success: true })
}