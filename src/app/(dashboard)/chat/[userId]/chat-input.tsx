"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

export function ChatInput({
  conversationId,
  senderId,
}: {
  conversationId: string
  senderId: string
}) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const send = async () => {
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    setText("")

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })

    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <Input
        ref={inputRef}
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        className="flex-1"
      />
      <Button size="icon" onClick={send} disabled={!text.trim() || sending}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
