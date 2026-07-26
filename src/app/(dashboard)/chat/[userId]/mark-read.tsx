"use client"

import { useEffect } from "react"
import { useSidebar } from "@/components/sidebar/sidebar-context"

export function MarkRead({ conversationId }: { conversationId: string }) {
  const { refreshConversations } = useSidebar()

  useEffect(() => {
    fetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    })
      .then(() => refreshConversations())
      .catch(() => {})
  }, [conversationId])

  return null
}
