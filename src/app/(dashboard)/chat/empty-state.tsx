"use client"

import { useSidebar } from "@/components/sidebar/sidebar-context"
import { Button } from "@/components/ui/button"
import { Menu, MessageCircle } from "lucide-react"

export function EmptyChatState() {
  const { setOpen } = useSidebar()
  return (
    <>
      <div className="flex items-center gap-1 px-2 h-14 border-b flex-shrink-0 md:hidden">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold">Bakaiti</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Select a user to start chatting</p>
        </div>
      </div>
    </>
  )
}
