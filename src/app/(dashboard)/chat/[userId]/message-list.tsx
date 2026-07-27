"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Message } from "@/types"
import { useSidebar } from "@/components/sidebar/sidebar-context"

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" })
  }, [display])

  useEffect(() => {
    messages.current = initialMessages
    setDisplay(initialMessages)
  }, [initialMessages])

  const firstUnreadIndex = display.findIndex(
    (m) => !m.read && m.sender_id !== currentUserId
  )

  const isSameSender = (i: number) =>
    i > 0 && display[i].sender_id === display[i - 1].sender_id

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
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
            <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""} ${grouped ? "mt-0.5" : "mt-2"}`}>
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
                    isMine
                      ? "bg-primary text-primary-foreground rounded-[18px] rounded-br-[6px]"
                      : "bg-muted rounded-[18px] rounded-bl-[6px]"
                  } ${grouped ? (isMine ? "rounded-br-[18px]" : "rounded-bl-[18px]") : ""}`}
                >
                  {msg.content}
                </div>
                {isMine && (
                  <span className={`text-[10px] px-1 leading-none ${msg.read ? "text-blue-400" : "text-muted-foreground"}`}>
                    {msg.read ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
