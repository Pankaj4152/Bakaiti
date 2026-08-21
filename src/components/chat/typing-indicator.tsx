"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export function TypingIndicator({
  conversationId,
  otherUserId,
}: {
  conversationId: string
  otherUserId: string
}) {
  const [typing, setTyping] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const supabase = createClient()

  useEffect(() => {
    const topic = `typing:${conversationId}`
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${topic}` || c.topic === topic)
    if (existing) {
      void supabase.removeChannel(existing)
    }
    const channel = supabase
      .channel(topic)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === otherUserId) {
          setTyping(true)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setTyping(false), 3000)
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      clearTimeout(timer.current)
    }
  }, [conversationId, otherUserId, supabase])

  if (!typing) return null

  return (
    <span className="text-xs text-muted-foreground animate-pulse">typing...</span>
  )
}
