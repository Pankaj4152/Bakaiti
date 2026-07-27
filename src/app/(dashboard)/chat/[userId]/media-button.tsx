"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Image } from "lucide-react"
import { SharedMediaDialog } from "@/components/chat/shared-media-dialog"

export function MediaButton({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen(true)} title="Shared Media">
        <Image className="h-4 w-4" />
      </Button>
      <SharedMediaDialog conversationId={conversationId} open={open} onOpenChange={setOpen} />
    </>
  )
}
