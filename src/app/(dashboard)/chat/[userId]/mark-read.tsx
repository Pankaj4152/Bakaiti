"use client"

import { useEffect } from "react"

export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    fetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    }).catch(() => {})
  }, [conversationId])

  return null
}
