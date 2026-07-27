"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Image } from "lucide-react"
import { AudioRecorder } from "@/components/chat/audio-recorder"
import { StickerPicker } from "@/components/chat/stickers/sticker-picker"
import { CommandSuggestions } from "@/components/chat/command-suggestions"
import { COMMANDS, type Command } from "@/lib/commands"
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
  const [showCommands, setShowCommands] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const typingChannel = useRef<ReturnType<typeof supabase.channel>>(undefined)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const insertAI = async (response: string) => {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: response,
      is_ai: true,
    })
  }

  const callBakaitCommand = async (command: string, extra: Record<string, any> = {}) => {
    const res = await fetch("/api/bakait/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, conversationId, ...extra }),
    })
    const data = await res.json()
    if (res.ok && data.response) await insertAI(data.response)
  }

  const EFFECTS = ["/confetti", "/fireworks", "/rain"]

  useEffect(() => {
    const channel = supabase.channel(`typing:${conversationId}`)
    channel.subscribe()
    typingChannel.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  const broadcastTyping = useCallback(() => {
    if (!typingChannel.current) return
    if (typingTimer.current) return
    typingChannel.current.send({ type: "broadcast", event: "typing", payload: { userId: senderId } })
    typingTimer.current = setTimeout(() => { typingTimer.current = undefined }, 2500)
  }, [senderId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setText(val)
    setShowCommands(val.startsWith("/"))
    broadcastTyping()
  }

  const handleCommandSelect = (cmd: Command) => {
    setShowCommands(false)
    if (cmd.command === "/poll") {
      setText('/poll "Question" "Option 1" "Option 2" ')
      inputRef.current?.focus()
      return
    }
    if (cmd.command === "/roast") {
      setText("/roast ")
      inputRef.current?.focus()
      return
    }
    if (cmd.command === "/spam") {
      setText("/spam  ")
      inputRef.current?.focus()
      return
    }
    if (cmd.command === "/irritate") {
      setText("/irritate ")
      inputRef.current?.focus()
      return
    }
    if (cmd.command === "/remember") {
      setText("/remember ")
      inputRef.current?.focus()
      return
    }
    sendCommand(cmd.command)
  }

  const sendCommand = async (command: string) => {
    setSending(true)
    try {
      if (EFFECTS.includes(command)) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: command.slice(1),
          is_ai: false,
        })
      } else if (command === "/stfu") {
        setText("")
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: "🛑 STFU — irritate bot stopped",
          is_ai: true,
        })
      } else {
        await callBakaitCommand(command)
      }
    } catch {}
    setSending(false)
  }

  const uploadFile = async (file: File) => {
    setSending(true)
    const ext = file.name.split(".").pop() ?? "png"
    const fileName = `${conversationId}/${Date.now()}_${senderId}.${ext}`
    const { error } = await supabase.storage.from("images").upload(fileName, file)
    if (error) { setSending(false); return }
    const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(fileName)
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: null,
      image_url: publicUrl,
    })
    setSending(false)
  }

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
            content: data.reply,
            is_ai: true,
          })
        }
      } catch {}
      setSending(false)
      return
    }

    if (content.startsWith("/poll")) {
      setText("")
      setSending(true)
      const match = content.match(/"([^"]+)"/g)
      if (match && match.length >= 3) {
        const question = match[0].replace(/"/g, "")
        const options = match.slice(1).map((m) => m.replace(/"/g, ""))
        try {
          await fetch("/api/poll/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId, question, options }),
          })
        } catch {}
      }
      setSending(false)
      return
    }

    if (content.startsWith("/roast")) {
      const userMsg = content.slice(6).trim()
      setText("")
      setSending(true)
      try {
        if (userMsg) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: userMsg,
          })
        }
        const res = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, triggerUserId: senderId, userText: userMsg || undefined }),
        })
        const data = await res.json()
        if (res.ok && data.roast) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: data.roast,
            is_ai: true,
          })
        }
      } catch {}
      setSending(false)
      return
    }

    if (content.startsWith("/chaos")) {
      setText("")
      setSending(true)
      try {
        const res = await fetch("/api/chaos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        })
        const data = await res.json()
        if (res.ok && data.chaos) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: data.chaos,
            is_ai: true,
          })
        }
      } catch {}
      setSending(false)
      return
    }

    // Handle evil/fun commands
    const cmd = content.split(" ")[0].toLowerCase()
    const known = COMMANDS.find((c) => c.command === cmd || c.aliases?.includes(cmd))
    if (known && !["/remember", "/poll", "/roast", "/chaos"].includes(known.command)) {
      setText("")
      setSending(true)
      try {
        if (known.command === "/spam") {
          const parts = content.slice(6).trim().split(" ")
          const count = parseInt(parts.pop() ?? "3", 10)
          const msg = parts.join(" ")
          if (msg) {
            for (let i = 0; i < Math.min(count, 10); i++) {
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content: msg,
              })
            }
          }
        } else if (EFFECTS.includes(known.command)) {
          const effect = known.command.slice(1)
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: effect,
          })
        } else if (known.command === "/stfu") {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: "🛑 STFU — irritate bot stopped",
            is_ai: true,
          })
        } else {
          const targetUsername = content.split(" ")[1] ?? ""
          let targetUserId: string | undefined
          if (targetUsername) {
            const { data: target } = await supabase
              .from("allowed_users")
              .select("id")
              .eq("username", targetUsername.replace("@", ""))
              .maybeSingle()
            if (target) targetUserId = target.id
          }
          await callBakaitCommand(known.command, { targetUserId })
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

  const handleStickerSelect = async (url: string) => {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sticker_url: url,
    })

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, senderId, content: "sent a sticker" }),
    }).catch(() => {})
  }

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <Input
        ref={inputRef}
        placeholder="Type a message..."
        value={text}
          onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        className="flex-1"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) { uploadFile(file); e.target.value = "" }
        }}
      />
      <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={sending}>
        <Image className="h-4 w-4" />
      </Button>
      <StickerPicker onSelect={handleStickerSelect} />
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
