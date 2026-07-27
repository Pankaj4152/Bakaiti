"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Message, Reaction } from "@/types"
import { useSidebar } from "@/components/sidebar/sidebar-context"
import { AudioMessage } from "@/components/chat/audio-message"
import { ImageMessage } from "@/components/chat/image-message"
import { MessageEffect } from "@/components/chat/message-effects"
import { PollCard } from "@/components/chat/poll-card"

const EMOJI_LIST = ["😂", "🔥", "💀", "❤️", "😭", "🥹"]

export function MessageList({
  messages: initialMessages,
  currentUserId,
  conversationId,
}: {
  messages: Message[]
  currentUserId: string
  conversationId: string
}) {
  const messages = useRef<Message[]>(initialMessages)
  const [display, setDisplay] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { refreshConversations } = useSidebar()
  const senderCache = useRef<Record<string, any>>({})
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [pickingEmojiFor, setPickingEmojiFor] = useState<string | null>(null)

  useEffect(() => {
    if (!initialMessages[0]) return
    const cache: Record<string, any> = {}
    for (const msg of initialMessages) {
      if (msg.sender && !cache[msg.sender_id]) cache[msg.sender_id] = msg.sender
    }
    senderCache.current = cache
  }, [initialMessages])

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message
          const cached = senderCache.current[newMsg.sender_id]
          if (cached) {
            newMsg.sender = cached
          } else if (!newMsg.sender) {
            const { data: sender } = await supabase
              .from("allowed_users")
              .select("*")
              .eq("id", newMsg.sender_id)
              .maybeSingle()
            newMsg.sender = sender ?? undefined
            if (sender) senderCache.current[newMsg.sender_id] = sender
          }

          if (newMsg.sender_id !== currentUserId) {
            await fetch("/api/messages/mark-read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId }),
            })
            newMsg.read = true
            refreshConversations()
          }

          messages.current = [...messages.current, newMsg]
          setDisplay([...messages.current])
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          let changed = false
          messages.current = messages.current.map((m) => {
            if (m.id === updated.id && m.read !== updated.read) {
              changed = true
              return { ...m, read: updated.read }
            }
            return m
          })
          if (changed) {
            setDisplay([...messages.current])
            refreshConversations()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId])

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const existing = (reactions[messageId] ?? []).find((r) => r.user_id === currentUserId && r.emoji === emoji)
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id)
    } else {
      await supabase.from("reactions").insert({ message_id: messageId, user_id: currentUserId, emoji })
    }
  }, [reactions, currentUserId])

  const groupReactions = (messageId: string) => {
    const msgReactions = reactions[messageId] ?? []
    const grouped: Record<string, { emoji: string; count: number; mine: boolean }> = {}
    for (const r of msgReactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, mine: false }
      grouped[r.emoji].count++
      if (r.user_id === currentUserId) grouped[r.emoji].mine = true
    }
    return Object.values(grouped).sort((a, b) => b.count - a.count)
  }

  useEffect(() => {
    const messageIds = messages.current.map((m) => m.id)
    if (messageIds.length === 0) return
    supabase
      .from("reactions")
      .select("*")
      .in("message_id", messageIds)
      .then(({ data }) => {
        if (data) {
          const grouped: Record<string, Reaction[]> = {}
          for (const r of data) {
            if (!grouped[r.message_id]) grouped[r.message_id] = []
            grouped[r.message_id].push(r)
          }
          setReactions(grouped)
        }
      })

    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        (payload) => {
          setReactions((prev) => {
            const next = { ...prev }
            const msgId = (payload.new as Reaction)?.message_id ?? (payload.old as Reaction)?.message_id
            if (!msgId) return prev
            if (payload.eventType === "INSERT") {
              const r = payload.new as Reaction
              next[msgId] = [...(next[msgId] ?? []), r]
            } else if (payload.eventType === "DELETE") {
              const r = payload.old as Reaction
              next[msgId] = (next[msgId] ?? []).filter((x) => x.id !== r.id)
            }
            return next
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => {
    if (!pickingEmojiFor) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-emoji-picker]")) setPickingEmojiFor(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [pickingEmojiFor])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" })
  }, [display])

  useEffect(() => {
    messages.current = initialMessages
    setDisplay(initialMessages)
  }, [initialMessages])

  const [activeEffect, setActiveEffect] = useState<string | null>(null)

  const EFFECT_MESSAGES = ["confetti", "fireworks", "rain"]

  // Trigger effect when an effect message is in the list
  useEffect(() => {
    const lastMsg = display[display.length - 1]
    if (lastMsg?.content && EFFECT_MESSAGES.includes(lastMsg.content.toLowerCase())) {
      setActiveEffect(lastMsg.content.toLowerCase())
      const timer = setTimeout(() => setActiveEffect(null), 4500)
      return () => clearTimeout(timer)
    }
  }, [display])

  const firstUnreadIndex = display.findIndex(
    (m) => !m.read && m.sender_id !== currentUserId
  )

  const isSameSender = (i: number) =>
    i > 0 && display[i].sender_id === display[i - 1].sender_id

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
      {activeEffect && <MessageEffect effect={activeEffect} />}
      {display.map((msg, i) => {
        const isMine = msg.sender_id === currentUserId
        const showUnreadSeparator = i === firstUnreadIndex
        const grouped = isSameSender(i)
        const isLastInGroup = i === display.length - 1 || display[i + 1].sender_id !== msg.sender_id

        return (
          <div key={msg.id}>
            {showUnreadSeparator && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground">Unread</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className={`flex gap-2 group/message ${isMine ? "flex-row-reverse" : ""} ${grouped ? "mt-0.5" : "mt-2"}`}>
              {!isMine && (
                <div className="w-7 flex-shrink-0">
                  {isLastInGroup ? (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={msg.sender?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {msg.sender?.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-7 w-7" />
                  )}
                </div>
              )}
              <div className="flex flex-col items-end gap-0.5 max-w-[75%]">
                <div
                  className={`px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                    msg.is_ai
                      ? "bg-zinc-900 text-zinc-100 border border-amber-500/40 rounded-[18px] rounded-br-[6px]"
                      : isMine
                        ? "bg-primary text-primary-foreground rounded-[18px] rounded-br-[6px]"
                        : "bg-muted rounded-[18px] rounded-bl-[6px]"
                  } ${grouped ? (isMine ? "rounded-br-[18px]" : "rounded-bl-[18px]") : ""}`}
                >
                  {msg.is_ai && (
                    <span className="text-[10px] opacity-70 mr-1.5">🤖</span>
                  )}
                  {msg.sticker_url ? (
                    <img src={msg.sticker_url} alt="" className="max-w-[180px] max-h-[180px] object-contain" />
                  ) : msg.poll_id ? (
                    <div>
                      <p className="text-sm mb-2">{msg.content}</p>
                      <PollCard pollId={msg.poll_id} currentUserId={currentUserId} />
                    </div>
                  ) : msg.image_url ? (
                    <ImageMessage url={msg.image_url} />
                  ) : msg.audio_url ? (
                    <AudioMessage url={msg.audio_url} />
                  ) : msg.content && EFFECT_MESSAGES.includes(msg.content.toLowerCase()) ? (
                    <span className="text-lg">{msg.content === "confetti" ? "🎉" : msg.content === "fireworks" ? "🎆" : "🌧️"}</span>
                  ) : (
                    msg.content
                  )}
                </div>
                {isMine && (
                  <span className={`text-[10px] px-1 leading-none ${msg.read ? "text-blue-400" : "text-muted-foreground"}`}>
                    {msg.read ? "✓✓" : "✓"}
                  </span>
                )}
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                  {groupReactions(msg.id).map((g) => (
                    <button
                      key={g.emoji}
                      onClick={() => toggleReaction(msg.id, g.emoji)}
                      className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                        g.mine
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-muted/50 border-border hover:bg-muted"
                      }`}
                    >
                      {g.emoji} {g.count > 1 ? g.count : ""}
                    </button>
                  ))}
                  {pickingEmojiFor === msg.id ? (
                    <div data-emoji-picker className="flex items-center gap-0.5 bg-popover border rounded-full px-1.5 py-0.5 shadow-sm">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { toggleReaction(msg.id, emoji); setPickingEmojiFor(null) }}
                          className="text-sm hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => setPickingEmojiFor(msg.id)}
                      className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover/message:opacity-100 transition-opacity"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
