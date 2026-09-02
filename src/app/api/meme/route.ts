import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateMeme } from "@/lib/gemini"
import { renderMemeSVG } from "@/lib/meme-templates"
import { getAuthUser, isConversationMember, getConversationUserMap } from "@/lib/auth"

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
    .select("type, user1_id, user2_id")
    .eq("id", conversationId)
    .single()

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const { userIdToName, userNames } = await getConversationUserMap(conversationId, convo)

  const { data: messages } = await admin
    .from("messages")
    .select("content, audio_url, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (!messages || messages.length < 3) {
    return NextResponse.json({ error: "Not enough messages for a meme yet" }, { status: 400 })
  }

  const { data: cooldownSeconds, error: cooldownError } = await admin.rpc("claim_meme_cooldown", { p_user_id: user.id })
  if (cooldownError) return NextResponse.json({ error: "Could not check meme cooldown" }, { status: 500 })
  if (typeof cooldownSeconds === "number" && cooldownSeconds > 0) {
    return NextResponse.json({ error: `Wait ${cooldownSeconds}s before sending another meme`, retryAfterSeconds: cooldownSeconds }, { status: 429, headers: { "Retry-After": String(cooldownSeconds) } })
  }

  const recentMessages = (messages ?? [])
    .filter((m) => m.content && !m.content.startsWith("🚪") && !m.content.startsWith("⚡ 5-MIN"))
    .reverse()
    .map((m) => ({
      sender_name: userIdToName[m.sender_id] ?? "Unknown",
      content: m.content ?? null,
      created_at: m.created_at,
    }))

  const memeText = await generateMeme(recentMessages.length > 0 ? recentMessages : messages.reverse().map(m => ({ sender_name: userIdToName[m.sender_id] ?? "Unknown", content: m.content, created_at: m.created_at })), userNames, userPrompt)
  if (!memeText) {
    await admin.from("meme_cooldowns").delete().eq("user_id", user.id)
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
    await admin.from("meme_cooldowns").delete().eq("user_id", user.id)
    return NextResponse.json({ error: "Failed to upload meme" }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from("images").getPublicUrl(fileName)

  const { data: inserted, error: insertError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: `${memeText.topText} | ${memeText.bottomText}`,
      image_url: publicUrl,
      is_ai: true,
    })
    .select("*, sender:allowed_users(*)")
    .single()

  if (insertError || !inserted) {
    await admin.storage.from("images").remove([fileName])
    await admin.from("meme_cooldowns").delete().eq("user_id", user.id)
    return NextResponse.json({ error: "Failed to send meme" }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: inserted })
}
