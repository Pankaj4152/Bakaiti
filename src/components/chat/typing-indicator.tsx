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
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === otherUserId) {
          setTyping(true)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setTyping(false), 3000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      clearTimeout(timer.current)
    }
  }, [conversationId, otherUserId])

  if (!typing) return null

  return (
    <span className="text-xs text-muted-foreground animate-pulse">typing...</span>
  )
}
