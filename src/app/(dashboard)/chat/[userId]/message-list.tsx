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
import { GlitchEffect } from "@/components/chat/glitch-effect"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Heart, Pin, SmilePlus } from "lucide-react"
import { TranslateButton } from "@/components/chat/translate-button"
import { format } from "date-fns"

const EMOJI_LIST = ["😂", "🔥", "💀", "❤️", "😭", "🥹"]

interface Pin {
  id: string
  message_id: string
  created_at: string
  pinned_by: string
  message?: Message | null
}

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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTap = useRef<{ messageId: string; at: number } | null>(null)
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [pickingEmojiFor, setPickingEmojiFor] = useState<string | null>(null)
  const [pinned, setPinned] = useState<Pin[]>([])
  const [messageIds, setMessageIds] = useState<string[]>(initialMessages.map((m) => m.id))
  const [pageActive, setPageActive] = useState(() => typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollBottom = useRef(true)

  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return format(date, "h:mm a")
    const isThisYear = date.getFullYear() === now.getFullYear()
    return isThisYear ? format(date, "MMM d, h:mm a") : format(date, "MMM d yyyy, h:mm a")
  }

  const handleLongPressDown = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      setPickingEmojiFor((prev) => (prev === msgId ? null : msgId))
    }, 500)
  }

  const handleLongPressUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchEnd = (messageId: string) => {
    handleLongPressUp()
    const now = Date.now()
    if (lastTap.current?.messageId === messageId && now - lastTap.current.at < 320) {
      void toggleReaction(messageId, "❤️")
      lastTap.current = null
    } else {
      lastTap.current = { messageId, at: now }
    }
  }

  useEffect(() => {
    if (!initialMessages[0]) return
    const cache: Record<string, any> = {}
    for (const msg of initialMessages) {
      if (msg.sender && !cache[msg.sender_id]) cache[msg.sender_id] = msg.sender
    }
    senderCache.current = cache
  }, [initialMessages])

  // --- Pagination: load older messages when the user scrolls to the top. ---
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50)
  const oldestRef = useRef<string | null>(initialMessages[0]?.created_at ?? null)

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !oldestRef.current) return
    setLoadingOlder(true)
    try {
      const { data } = await supabase
        .from("messages")
        .select("*, sender:allowed_users(*)")
        .eq("conversation_id", conversationId)
        .lt("created_at", oldestRef.current)
        .order("created_at", { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        const older = data.reverse()
        for (const m of older) {
          if (m.sender && !senderCache.current[m.sender_id]) senderCache.current[m.sender_id] = m.sender
        }
        messages.current = [...older, ...messages.current]
        oldestRef.current = older[0].created_at
        setDisplay([...messages.current])
        setHasMore(data.length >= 50)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoadingOlder(false)
    }
  }, [conversationId, hasMore, loadingOlder, supabase])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollTop < 40) loadOlder()
    }
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [loadOlder])

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

          if (messages.current.some((m) => m.id === newMsg.id)) return
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

  useEffect(() => {
    const updatePageActive = () => setPageActive(document.visibilityState === "visible" && document.hasFocus())
    window.addEventListener("focus", updatePageActive)
    window.addEventListener("blur", updatePageActive)
    document.addEventListener("visibilitychange", updatePageActive)
    return () => {
      window.removeEventListener("focus", updatePageActive)
      window.removeEventListener("blur", updatePageActive)
      document.removeEventListener("visibilitychange", updatePageActive)
    }
  }, [])

  useEffect(() => {
    if (!pageActive || !scrollContainerRef.current) return
    const unreadIds = new Set(display.filter((message) => !message.read && message.sender_id !== currentUserId).map((message) => message.id))
    if (unreadIds.size === 0) return

    const observer = new IntersectionObserver((entries) => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) return
      const visibleIds = entries.filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6).map((entry) => (entry.target as HTMLElement).dataset.messageId).filter((id): id is string => !!id && unreadIds.has(id))
      if (visibleIds.length === 0) return
      visibleIds.forEach((id) => unreadIds.delete(id))
      fetch("/api/messages/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, messageIds: visibleIds }) })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to mark messages read")
          messages.current = messages.current.map((message) => visibleIds.includes(message.id) ? { ...message, read: true } : message)
          setDisplay([...messages.current])
          refreshConversations()
        })
        .catch(() => visibleIds.forEach((id) => unreadIds.add(id)))
    }, { root: scrollContainerRef.current, threshold: 0.6 })

    unreadIds.forEach((id) => {
      const element = document.getElementById(`msg-${id}`)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [conversationId, currentUserId, display, pageActive, refreshConversations])

  // Optimistic send: show our own freshly-inserted message instantly, before
  // the realtime INSERT round-trip. The realtime handler dedupes by id, so the
  // message only ever appears once.
  useEffect(() => {
    const onNewMessage = (e: Event) => {
      const newMsg = (e as CustomEvent).detail as Message
      if (!newMsg || newMsg.conversation_id !== conversationId) return
      if (messages.current.some((m) => m.id === newMsg.id)) return
      newMsg.sender = senderCache.current[newMsg.sender_id]
      messages.current = [...messages.current, newMsg]
      setDisplay([...messages.current])
    }
    window.addEventListener("bakaiti:new-message", onNewMessage)
    return () => window.removeEventListener("bakaiti:new-message", onNewMessage)
  }, [conversationId])

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const existing = (reactions[messageId] ?? []).find((r) => r.user_id === currentUserId && r.emoji === emoji)

    // Optimistic Update
    setReactions((prev) => {
      const next = { ...prev }
      if (existing) {
        next[messageId] = (next[messageId] ?? []).filter((x) => x.id !== existing.id)
      } else {
        const tempReaction: Reaction = {
          id: `temp-${Date.now()}`,
          message_id: messageId,
          user_id: currentUserId,
          emoji,
          created_at: new Date().toISOString(),
        }
        next[messageId] = [...(next[messageId] ?? []).filter((x) => !(x.user_id === currentUserId && x.emoji === emoji)), tempReaction]
      }
      return next
    })

    try {
      if (existing) {
        const { error } = await supabase.from("reactions").delete().eq("id", existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("reactions").insert({ message_id: messageId, user_id: currentUserId, emoji })
        if (error) throw error
      }
    } catch (err) {
      console.error("Failed to toggle reaction, reverting:", err)
      setReactions((prev) => {
        const next = { ...prev }
        if (existing) {
          next[messageId] = [...(next[messageId] ?? []).filter((x) => !(x.user_id === currentUserId && x.emoji === emoji)), existing]
        } else {
          next[messageId] = (next[messageId] ?? []).filter((x) => !(x.user_id === currentUserId && x.emoji === emoji))
        }
        return next
      })
    }
  }, [reactions, currentUserId, supabase])

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

  // Keep messageIds in sync with the growing message list
  useEffect(() => {
    setMessageIds(messages.current.map((m) => m.id))
  }, [display])

  useEffect(() => {
    const ids = messageIds
    if (ids.length === 0) return
    supabase
      .from("reactions")
      .select("*")
      .in("message_id", ids)
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
            // Ignore reactions for messages outside this conversation.
            if (!ids.includes(msgId)) return prev
            if (payload.eventType === "INSERT") {
              const r = payload.new as Reaction
              next[msgId] = [...(next[msgId] ?? []).filter((x) => !(x.user_id === r.user_id && x.emoji === r.emoji)), r]
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
  }, [conversationId, messageIds])

  useEffect(() => {
    if (!pickingEmojiFor) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-emoji-picker]")) setPickingEmojiFor(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [pickingEmojiFor])

  // Load pinned messages for this conversation.
  const loadPins = useCallback(async () => {
    try {
      const res = await fetch(`/api/pin?conversationId=${conversationId}`)
      const data = await res.json()
      setPinned(data.pins ?? [])
    } catch {
      setPinned([])
    }
  }, [conversationId])

  useEffect(() => {
    loadPins()
  }, [loadPins])

  const togglePin = useCallback(async (msg: Message) => {
    const existing = pinned.find((p) => p.message_id === msg.id)
    if (existing) {
      await fetch(`/api/pin?messageId=${msg.id}`, { method: "DELETE" })
    } else {
      await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messageId: msg.id }),
      })
    }
    loadPins()
  }, [pinned, conversationId, loadPins])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    lastScrollBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [display])

  useEffect(() => {
    // Only auto-scroll to the newest message if the user is already near the
    // bottom (so reading older/history isn't interrupted by new arrivals).
    if (lastScrollBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" })
    }
  }, [display])

  useEffect(() => {
    messages.current = initialMessages
    setDisplay(initialMessages)
    setHasMore(initialMessages.length >= 50)
    oldestRef.current = initialMessages[0]?.created_at ?? null
  }, [initialMessages])

  const [activeEffect, setActiveEffect] = useState<string | null>(null)

  const EFFECT_MESSAGES = ["confetti", "fireworks", "rain", "glitch"]

  useEffect(() => {
    const lastMsg = display[display.length - 1]
    if (lastMsg?.content) {
      const [effectName, ...rest] = lastMsg.content.toLowerCase().split(" ")
      if (EFFECT_MESSAGES.includes(effectName)) {
        setActiveEffect(lastMsg.content)
        const timer = setTimeout(() => setActiveEffect(null), 4500)
        return () => clearTimeout(timer)
      }
    }
  }, [display])

  const firstUnreadIndex = display.findIndex(
    (m) => !m.read && m.sender_id !== currentUserId
  )

  const isSameSender = (i: number) =>
    i > 0 && display[i].sender_id === display[i - 1].sender_id

  return (
    <TooltipProvider>
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" ref={scrollContainerRef}>
      {pinned.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pb-2 mb-2 border-b border-dashed border-border">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            <Pin className="h-3 w-3" />
            Pinned
          </span>
          {pinned.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                p.message?.id && document.getElementById(`msg-${p.message.id}`)?.scrollIntoView({ behavior: "smooth" })
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 hover:bg-muted rounded-full px-2 py-0.5 truncate max-w-[200px] transition-colors"
              title="Scroll to message"
            >
              {p.message?.content ? (
                <span className="truncate">{p.message.content.slice(0, 60)}</span>
              ) : p.message?.sticker_url ? (
                <span>📌 Sticker</span>
              ) : p.message?.image_url ? (
                <span>📌 Photo</span>
              ) : p.message?.audio_url ? (
                <span>📌 Voice message</span>
              ) : (
                <span>📌 Message</span>
              )}
            </button>
          ))}
        </div>
      )}
      {activeEffect && (() => {
        const [name, ...rest] = activeEffect.split(" ")
        if (name === "glitch") return <GlitchEffect />
        return <MessageEffect effect={name} customEmoji={rest.join(" ")} />
      })()}
      {display.map((msg, i) => {
        const isMine = msg.sender_id === currentUserId
        const showUnreadSeparator = i === firstUnreadIndex
        const grouped = isSameSender(i)
        const isLastInGroup = i === display.length - 1 || display[i + 1].sender_id !== msg.sender_id

        return (
          <div key={msg.id} id={`msg-${msg.id}`} data-message-id={msg.id}>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onMouseDown={() => handleLongPressDown(msg.id)}
                      onMouseUp={handleLongPressUp}
                      onMouseLeave={handleLongPressUp}
                      onTouchStart={() => handleLongPressDown(msg.id)}
                      onTouchEnd={() => handleTouchEnd(msg.id)}
                      onDoubleClick={() => void toggleReaction(msg.id, "❤️")}
                      className={`px-3.5 py-2 text-sm whitespace-pre-wrap break-words cursor-pointer ${
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
                      ) : msg.content && EFFECT_MESSAGES.includes(msg.content.toLowerCase().split(" ")[0]) ? (
                        <span className="text-lg">{msg.content.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu)?.[0] ?? (msg.content.startsWith("confetti") ? "🎉" : msg.content.startsWith("fireworks") ? "🎆" : "🌧️")}</span>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" align={isMine ? "end" : "start"}>
                    {formatMessageTime(msg.created_at)}
                  </TooltipContent>
                </Tooltip>
                {isMine && (
                  <span className={`text-[10px] px-1 leading-none ${msg.read ? "text-blue-400" : "text-muted-foreground"}`}>
                    {msg.read ? "✓✓" : "✓"}
                  </span>
                )}
                <div className="flex items-center gap-1 mt-0.5 flex-wrap min-h-6">
                  {groupReactions(msg.id).map((g) => (
                    <button
                      key={g.emoji}
                      onClick={() => toggleReaction(msg.id, g.emoji)}
                      className={`text-xs px-2 py-0.5 rounded-full border shadow-sm transition-all hover:scale-105 ${
                        g.mine
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-muted/50 border-border hover:bg-muted"
                      }`}
                    >
                      {g.emoji} {g.count > 1 ? g.count : ""}
                    </button>
                  ))}
                  {pickingEmojiFor === msg.id ? (
                    <div data-emoji-picker className="flex items-center gap-1 bg-popover border rounded-full px-2 py-1 shadow-lg animate-in fade-in zoom-in-95">
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
                      className="h-6 w-6 rounded-full border bg-background/90 text-muted-foreground shadow-sm opacity-100 md:opacity-0 md:group-hover/message:opacity-100 focus:opacity-100 hover:text-foreground hover:bg-accent transition-all flex items-center justify-center"
                      title="React to message"
                      aria-label="React to message"
                    >
                      <SmilePlus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {pickingEmojiFor === msg.id && (
                    <>
                      <button
                        onClick={() => togglePin(msg)}
                        className={`text-xs hover:text-foreground transition-colors ${
                          pinned.some((p) => p.message_id === msg.id) ? "text-primary" : "text-muted-foreground"
                        }`}
                        title={pinned.some((p) => p.message_id === msg.id) ? "Unpin" : "Pin message"}
                        aria-label={pinned.some((p) => p.message_id === msg.id) ? "Unpin message" : "Pin message"}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                      <button onClick={() => { void toggleReaction(msg.id, "❤️"); setPickingEmojiFor(null) }} className="text-muted-foreground hover:text-red-500 transition-colors" title="Heart" aria-label="React with heart"><Heart className="h-3.5 w-3.5" /></button>
                      {msg.content && !msg.sticker_url && !msg.poll_id && (
                        <TranslateButton text={msg.content} />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
    </TooltipProvider>
  )
}
