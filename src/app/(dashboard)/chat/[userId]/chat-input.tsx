"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Image, X } from "lucide-react"
import { AudioRecorder } from "@/components/chat/audio-recorder"
import { StickerPicker } from "@/components/chat/stickers/sticker-picker"
import { ActionPlusMenu } from "@/components/chat/action-plus-menu"
import { CreatePollDialog } from "@/components/chat/create-poll-dialog"
import { NicknameBattleDialog } from "@/components/chat/nickname-battle-dialog"
import { CommandSuggestions } from "@/components/chat/command-suggestions"
import { COMMANDS, type Command } from "@/lib/commands"
import { sounds } from "@/lib/sounds"
import { haptics } from "@/lib/haptics"
import * as chrono from "chrono-node"

const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file)
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          quality
        )
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

function safeEval(expr: string): number | string {
  const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, "")
  try {
    const result = new Function(`"use strict"; return (${sanitized})`)()
    if (typeof result === "number" && !Number.isInteger(result)) {
      return parseFloat(result.toFixed(4))
    }
    return result
  } catch {
    return "Error"
  }
}

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
  const [feedback, setFeedback] = useState("")
  const [replyingTo, setReplyingTo] = useState<any>(null)
  const [showPollDialog, setShowPollDialog] = useState(false)
  const [pollMode, setPollMode] = useState<"standard" | "flash">("standard")
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const typingChannel = useRef<ReturnType<typeof supabase.channel>>(undefined)
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // 1. Mobile VisualViewport smooth keyboard tracking
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return
    const handleResize = () => {
      window.scrollTo(0, document.body.scrollHeight)
    }
    window.visualViewport.addEventListener("resize", handleResize)
    window.visualViewport.addEventListener("scroll", handleResize)
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize)
      window.visualViewport?.removeEventListener("scroll", handleResize)
    }
  }, [])

  useEffect(() => {
    const handleReply = (e: CustomEvent) => {
      setReplyingTo(e.detail)
      inputRef.current?.focus()
    }
    window.addEventListener("bakaiti:reply-message" as any, handleReply)
    return () => window.removeEventListener("bakaiti:reply-message" as any, handleReply)
  }, [])

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
  }, [])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [text])

  const insertAI = async (response: string) => {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: response,
      is_ai: true,
    })
  }

  const callBakaitCommand = async (command: string, extra: Record<string, string | undefined> = {}) => {
    const res = await fetch("/api/bakait/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, conversationId, ...extra }),
    })
    const data = await res.json()
    if (res.ok && data.response) await insertAI(data.response)
  }

  const EFFECTS = ["/confetti", "/fireworks", "/rain", "/glitch"]

  useEffect(() => {
    const topic = `typing:${conversationId}`
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${topic}` || c.topic === topic)
    if (existing) {
      void supabase.removeChannel(existing)
    }
    const channel = supabase.channel(topic)
    channel.subscribe()
    typingChannel.current = channel
    return () => { void supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  const broadcastTyping = useCallback(() => {
    if (!typingChannel.current) return
    if (typingTimer.current) return
    typingChannel.current.send({ type: "broadcast", event: "typing", payload: { userId: senderId } })
    typingTimer.current = setTimeout(() => { typingTimer.current = undefined }, 2500)
  }, [senderId])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)
    setShowCommands(val.startsWith("/"))
    broadcastTyping()
  }

  const handleCommandSelect = (cmd: Command) => {
    setShowCommands(false)
    let fillText = `${cmd.command} `
    if (cmd.command === "/poll") {
      fillText = '/poll "Question" "Option 1" "Option 2"'
    } else if (cmd.command === "/flashpoll") {
      fillText = '/flashpoll "Bunk 9 AM lecture?" "Yes" "No"'
    } else if (cmd.command === "/expose") {
      fillText = "/expose @"
    }
    setText(fillText)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.value.length
        inputRef.current.selectionEnd = inputRef.current.value.length
      }
    })
  }

  const sendCommand = async (command: string) => {
    setSending(true)
    try {
      if (EFFECTS.includes(command)) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: command.slice(1),
        })
      } else {
        await callBakaitCommand(command)
      }
    } catch {}
    setSending(false)
    focusInput()
  }

  const uploadFile = async (file: File) => {
    setSending(true)
    let fileToUpload = file
    if (file.type.startsWith("image/")) {
      try {
        fileToUpload = await compressImage(file)
      } catch (err) {
        console.error("Compression failed, using original file:", err)
      }
    }
    const ext = fileToUpload.name.split(".").pop() ?? "png"
    const fileName = `${conversationId}/${Date.now()}_${senderId}.${ext}`
    const { error } = await supabase.storage.from("images").upload(fileName, fileToUpload)
    if (error) { setSending(false); return }
    const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(fileName)
    const { data: inserted } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: null,
        image_url: publicUrl,
      })
      .select("*")
      .single()

    if (inserted) {
      sounds.playSentSound()
      window.dispatchEvent(new CustomEvent("bakaiti:new-message", { detail: inserted }))
    }

    setSending(false)
    focusInput()
  }

  const send = async (overrideContent?: string) => {
    const content = (overrideContent ?? text).trim()
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
            const items = (group as { items: { content: string }[] }).items
            lines.push(`${emoji} ${type.charAt(0) + type.slice(1).toLowerCase()} (${items.length}): ${items.map((i) => i.content).join(", ")}`)
          }

          if (data.quotes.length > 0) {
            lines.push(`🏆 Legendary Quotes (${data.quotes.length}): ${data.quotes.map((q: { quote: string }) => q.quote).join(", ")}`)
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

    if (content.startsWith("/expose")) {
      setText("")
      setSending(true)
      const parts = content.split(" ")
      let targetUsername = parts[1] ?? ""
      targetUsername = targetUsername.replace("@", "")
      if (!targetUsername) { setSending(false); return }

      try {
        const { data: target } = await supabase
          .from("allowed_users")
          .select("id")
          .eq("username", targetUsername)
          .maybeSingle()

        if (!target) { setSending(false); return }

        const res = await fetch("/api/expose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, targetUserId: target.id }),
        })
        const data = await res.json()
        if (res.ok && data.expose) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: `🎭 Exposing @${data.targetName}...\n\n${data.expose}`,
            is_ai: true,
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

    if (content.startsWith("/flashpoll") || content.startsWith("/flash")) {
      const parts = content.split(" ").slice(1)
      const question = parts[0] ? parts[0].replace(/"/g, "") : "Bunk 9 AM lecture?"
      const optionsRaw = parts.slice(1).map((p) => p.replace(/"/g, ""))
      const options = optionsRaw.length >= 2 ? optionsRaw : ["Yes 🚀", "No 📚"]

      const flashPollData = {
        id: `flash_${Date.now()}`,
        conversation_id: conversationId,
        question,
        created_at: new Date().toISOString(),
        created_by: senderId,
        expires_at: Date.now() + 5 * 60 * 1000,
        options: options.map((optText, i) => ({ id: `opt_${i}`, text: optText, votes: [] })),
      }

      try {
        localStorage.setItem(`bakaiti_flash_poll_${conversationId}`, JSON.stringify(flashPollData))
      } catch {}
      window.dispatchEvent(new Event(`bakaiti_flash_poll_update_${conversationId}`))

      setText("")
      setSending(true)
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: `⚡ 5-MIN FLASH POLL: ${question}`,
      })
      setSending(false)
      focusInput()
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
      setFeedback("🔥 Gemini is generating roast...")
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
          setFeedback("✓ Roast posted!")
        } else {
          setFeedback(data.error ?? "Failed to generate roast")
        }
      } catch {
        setFeedback("Failed to generate roast")
      } finally {
        setSending(false)
        setTimeout(() => setFeedback(""), 3500)
      }
      return
    }

    if (content.startsWith("/chaos")) {
      const userMsg = content.slice(6).trim()
      setText("")
      setSending(true)
      setFeedback("📰 Generating chaos news...")
      try {
        if (userMsg) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: userMsg,
          })
        }
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
          setFeedback("✓ Chaos news posted!")
        } else {
          setFeedback(data.error ?? "Failed to generate chaos")
        }
      } catch {
        setFeedback("Failed to generate chaos")
      } finally {
        setSending(false)
        setTimeout(() => setFeedback(""), 3500)
      }
      return
    }

    if (content.startsWith("/meme")) {
      const userPrompt = content.slice(5).trim() || undefined
      setText("")
      setSending(true)
      setFeedback("🎨 Generating & sending meme...")
      try {
        const response = await fetch("/api/meme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, userPrompt }) })
        const data = await response.json()
        setFeedback(response.ok ? "✓ Meme sent!" : data.error ?? "Could not send meme")
      } catch {
        setFeedback("Could not send meme")
      } finally {
        setSending(false)
        focusInput()
        setTimeout(() => setFeedback(""), 4000)
      }
      return
    }

    if (content.startsWith("/calc")) {
      const expr = content.slice(5).trim()
      setText("")
      if (!expr) return
      const result = safeEval(expr)
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: `🧮 ${expr} = ${result}`,
        is_ai: true,
      })
      return
    }

    if (content.startsWith("/help")) {
      setText("")
      const help = [
        "🤖 AI Fun\n/roast — Roast the chat\n/expose @user — Dig up embarrassing messages\n/chaos — Dramatic breaking news\n/remember @user — Recall memories & quotes\n/fortune — Random fortune\n/mood — Chat mood analysis\n/ghost-meter — Ghosting leaderboard\n/simps — Reply speed leaderboard\n/meme — Generate a meme\n\n",
        "🎮 Effects\n/confetti, /fireworks, /rain, /glitch — fun animations\n\n",
        "🔧 Utilities\n/calc <expr> — Calculator\n/remind @user|me <text> <time> — Set reminder\n/poll \"Q\" \"A\" \"B\" — Create poll\n/spam <msg> <N> — Repeat message\n\n",
        "💡 Tips\n• Long-press a message to react\n• Hover any message to see timestamp\n• Type / to see all commands\n• Mention @Bakait to chat with AI\n• Click + to start a new conversation",
      ].join("")
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: help,
      })
      return
    }

    if (content.startsWith("/remind")) {
      setText("")
      setSending(true)
      const rest = content.slice(8).trim()
      if (!rest) { setSending(false); return }

      let targetUserId = senderId
      let reminderText = rest

      if (rest.startsWith("@")) {
        const spaceIdx = rest.indexOf(" ")
        if (spaceIdx === -1) { setSending(false); return }
        const targetUsername = rest.slice(1, spaceIdx)
        reminderText = rest.slice(spaceIdx + 1).trim()
        if (!reminderText) { setSending(false); return }
        const { data: target } = await supabase
          .from("allowed_users")
          .select("id")
          .eq("username", targetUsername)
          .maybeSingle()
        if (target) targetUserId = target.id
      } else if (rest.startsWith("me ")) {
        reminderText = rest.slice(3).trim()
      }

      const parsed = chrono.parseDate(reminderText)
      if (!parsed || parsed.getTime() <= Date.now()) { setSending(false); return }

      const textOnly = reminderText.replace(
        /\b(today|tomorrow|next|in\s+\d+\s+\w+|at\s+\d+|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}\s*(am|pm)?)\b/gi,
        ""
      ).trim().replace(/\s+/g, " ").trim()

      try {
        await fetch("/api/remind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: targetUserId,
            createdBy: senderId,
            text: textOnly || "Reminder",
            remindAt: parsed.toISOString(),
          }),
        })
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: `⏰ Reminder set for ${parsed.toLocaleString()}${targetUserId !== senderId ? "" : ""}`,
        })
      } catch {}
      setSending(false)
      return
    }

    // Handle evil/fun commands
    const cmd = content.split(" ")[0].toLowerCase()
    const known = COMMANDS.find((c) => c.command === cmd || c.aliases?.includes(cmd))
    if (known && !["/remember", "/poll", "/roast", "/chaos", "/meme"].includes(known.command)) {
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
          const rest = content.slice(known.command.length).trim()
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: `${known.command.slice(1)} ${rest}`.trim(),
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

    let activeAnon = null
    try {
      const saved = localStorage.getItem(`bakaiti_anon_mode_${conversationId}`)
      if (saved) activeAnon = JSON.parse(saved)
    } catch {}

    const payload: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      content: activeAnon && content ? `[ANON:${activeAnon.emoji}:${activeAnon.name}] ${content}` : content,
    }
    const replyTarget = replyingTo ? { ...replyingTo } : null
    if (replyingTo) {
      payload.reply_to_id = replyingTo.id
      setReplyingTo(null)
    }

    const { data: inserted } = await supabase
      .from("messages")
      .insert(payload)
      .select("*, sender:allowed_users(*), reply_to:messages!reply_to_id(id, content, image_url, audio_url, sticker_url, sender:allowed_users(name))")
      .single()

    // Optimistically deliver the message to the current view immediately (the
    // realtime INSERT will dedupe by id so nothing posts twice).
    if (inserted) {
      if (replyTarget && !inserted.reply_to) {
        inserted.reply_to = {
          id: replyTarget.id,
          content: replyTarget.content,
          image_url: replyTarget.image_url,
          audio_url: replyTarget.audio_url,
          sticker_url: replyTarget.sticker_url,
          sender_name: replyTarget.sender?.name,
        }
      }
      sounds.playSentSound()
      haptics.light()
      window.dispatchEvent(new CustomEvent("bakaiti:new-message", { detail: inserted }))
    }

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        senderId,
        content,
        replyToId: replyTarget?.id,
        replyToContent: replyTarget?.content,
        replyToSenderName: replyTarget?.sender?.name,
      }),
    }).catch(() => {})

    setSending(false)
    focusInput()
  }

  const handleStickerSelect = async (url: string) => {
    const { data: inserted } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sticker_url: url,
      })
      .select("*")
      .single()

    if (inserted) {
      window.dispatchEvent(new CustomEvent("bakaiti:new-message", { detail: inserted }))
    }

    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, senderId, content: "sent a sticker" }),
    }).catch(() => {})
    focusInput()
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          await uploadFile(file)
        }
      }
    }
  }

  return (
    <div className="relative flex flex-col gap-1 p-3 border-t border-white/10 bg-black/40 backdrop-blur-xl">
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/70 border-l-4 border-primary rounded-md text-xs animate-in fade-in slide-in-from-bottom-1">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-primary text-[11px]">
              Replying to {replyingTo.sender?.name ?? "message"}
            </span>
            <span className="truncate text-muted-foreground text-[11px]">
              {replyingTo.content || (replyingTo.image_url ? "📷 Photo" : replyingTo.audio_url ? "🎤 Voice note" : replyingTo.sticker_url ? "📌 Sticker" : "Attachment")}
            </span>
          </div>
          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 hover:bg-background/80" onClick={() => setReplyingTo(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {feedback && <p role="status" className="absolute bottom-full left-4 right-4 mb-2 rounded-md border bg-popover px-3 py-2 text-center text-sm shadow-md">{feedback}</p>}
      {showCommands && (
        <CommandSuggestions
          text={text}
          onSelect={handleCommandSelect}
          onClose={() => setShowCommands(false)}
        />
      )}
      <div className="flex items-center gap-2">
        <textarea
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
          onPaste={handlePaste}
          rows={1}
          className="flex-1 min-h-[38px] max-h-[200px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto"
          readOnly={sending}
          aria-busy={sending}
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
        <ActionPlusMenu
          onSelectImage={() => fileInputRef.current?.click()}
          onSelectPoll={() => {
            setPollMode("standard")
            setShowPollDialog(true)
          }}
          onSelectFlashPoll={() => {
            setPollMode("flash")
            setShowPollDialog(true)
          }}
          onSelectNicknameBattle={() => setShowNicknameDialog(true)}
        />
        <CreatePollDialog
          conversationId={conversationId}
          currentUserId={senderId}
          open={showPollDialog}
          onOpenChange={setShowPollDialog}
          initialMode={pollMode}
        />
        <NicknameBattleDialog
          conversationId={conversationId}
          currentUserId={senderId}
          open={showNicknameDialog}
          onOpenChange={setShowNicknameDialog}
        />
        <AudioRecorder
          conversationId={conversationId}
          senderId={senderId}
          onDone={() => setRecordingActive(false)}
        />
        <Button size="icon" onClick={() => send()} disabled={!text.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
