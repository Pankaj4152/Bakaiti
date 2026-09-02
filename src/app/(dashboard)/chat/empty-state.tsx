"use client"

import { MessageCircle } from "lucide-react"

export function EmptyChatState() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
          <MessageCircle className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    </div>
  )
}
