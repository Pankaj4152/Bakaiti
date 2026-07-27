"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { AudioRecorder } from "@/components/chat/audio-recorder"
export function ChatInput({
  conversationId,
  senderId,
}: {
  conversationId: string
  senderId: string
}) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [recordingActive, setRecordingActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const send = async () => {
    const content = text.trim()
    if (!content || sending) return

    if (content.startsWith("/remember")) {
      setText("")
      setSending(true)
      const parts = content.split(" ")
      const username = parts[1] ?? ""
      if (!username) { setSending(false); return }

      try {
        const res = await fetch("/api/remember", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, username }),
        })
        const data = await res.json()
        if (res.ok) {
          const lines: string[] = [`📝 Memories of @${data.name}:`]

          const typeEmojis: Record<string, string> = {
            PROMISE: "🔴", EXCUSE: "😅", LIE: "🤥",
            EMBARRASSING: "😳", FUNNY: "😂", CONTRADICTION: "🔄",
          }

          for (const [type, group] of Object.entries(data.memories)) {
            const emoji = typeEmojis[type] ?? "📌"
            const items = (group as any).items as { content: string }[]
            lines.push(`${emoji} ${type.charAt(0) + type.slice(1).toLowerCase()} (${items.length}): ${items.map((i) => i.content).join(", ")}`)
          }

          if (data.quotes.length > 0) {
            lines.push(`🏆 Legendary Quotes (${data.quotes.length}): ${data.quotes.map((q: any) => q.quote).join(", ")}`)
          }

          if (lines.length === 1) lines.push("Nothing saved yet for this user")

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: lines.join("\n"),
          })
        }
      } catch {}
      setSending(false)
      return
    }

    if (content.includes("@Bakait") || content.includes("@bakait")) {
      setText("")
      setSending(true)
      const cleanMsg = content.replace(/@Bakait/gi, "").trim()
      if (!cleanMsg) { setSending(false); return }

      try {
        const { data: recent } = await supabase
          .from("messages")
          .select("content, audio_url, sender_id")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(10)

        const { data: senderNames } = await supabase
          .from("allowed_users")
          .select("id, name")
          .in("id", [senderId])

        const userIdToName: Record<string, string> = {}
        if (senderNames) for (const u of senderNames) userIdToName[u.id] = u.name

        const recentMessages = (recent ?? []).reverse().map((m) => ({
          sender_name: userIdToName[m.sender_id] ?? "Unknown",
          content: m.content ?? null,
        }))

        const res = await fetch("/api/chat/bakait", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: cleanMsg,
            recentMessages,
            senderId,
            conversationId,
          }),
        })
        const data = await res.json()
        if (res.ok && data.reply) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: `🤖 Bakait: ${data.reply}`,
          })
        }
      } catch {}
      setSending(false)
      return
    }

    if (content.startsWith("/roast") || content.startsWith("/chaos")) {
      setText("")
      setSending(true)
      try {
        const isChaos = content.startsWith("/chaos")
        const res = await fetch(`/api/${isChaos ? "chaos" : "roast"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        })
        const data = await res.json()
        if (res.ok) {
          const text = isChaos ? data.chaos : data.roast
          if (text) {
            await supabase.from("messages").insert({
              conversation_id: conversationId,
              sender_id: senderId,
              content: isChaos ? `📰 Bakait News: ${text}` : `🔥 Bakait: ${text}`,
            })
          }
        }
      } catch {}
      setSending(false)
      return
    }

    setSending(true)
    setText("")

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, senderId, content }),
    }).catch(() => {})

    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <Input
        ref={inputRef}
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        className="flex-1"
      />
      <AudioRecorder
        conversationId={conversationId}
        senderId={senderId}
        onDone={() => setRecordingActive(false)}
      />
      <Button size="icon" onClick={send} disabled={!text.trim() || sending}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
