"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Message } from "@/types"

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
          if (!newMsg.sender) {
            const { data: sender } = await supabase
              .from("allowed_users")
              .select("*")
              .eq("id", newMsg.sender_id)
              .maybeSingle()
            newMsg.sender = sender ?? undefined
          }

          if (newMsg.sender_id !== currentUserId) {
            await fetch("/api/messages/mark-read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId }),
            })
            newMsg.read = true
          }

          messages.current = [...messages.current, newMsg]
          setDisplay([...messages.current])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [display])

  const firstUnreadIndex = display.findIndex(
    (m) => !m.read && m.sender_id !== currentUserId
  )

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {display.map((msg, i) => {
        const isMine = msg.sender_id === currentUserId
        const showUnreadSeparator = i === firstUnreadIndex

        return (
          <div key={msg.id}>
            {showUnreadSeparator && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground">Unread</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
              {!isMine && (
                <Avatar className="h-7 w-7 mt-1 flex-shrink-0">
                  <AvatarImage src={msg.sender?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {msg.sender?.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col items-end gap-0.5">
                <div
                  className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {isMine && (
                  <span className={`text-[10px] px-1 ${msg.read ? "text-blue-400" : "text-muted-foreground"}`}>
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
