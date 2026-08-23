"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

export function HelpDialog({ placement = "icon" }: { placement?: "icon" | "footer" }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={placement === "footer" ? "w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" : "shrink-0 h-8 w-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors"} title="Help & Commands">
          <HelpCircle className="h-4 w-4" />
          {placement === "footer" && <span>Help & tips</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to Use Bakaiti</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-semibold text-base mb-1">💬 Messaging</h3>
            <p className="text-muted-foreground">Send text, images, voice messages, and stickers. All messages are real-time.</p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
              <li><strong>Images:</strong> Click the image icon to attach photos/videos</li>
              <li><strong>Voice:</strong> Click the mic to record and send voice messages</li>
              <li><strong>Stickers:</strong> Click the sticker icon to pick or upload stickers</li>
              <li><strong>Read receipts:</strong> ✓ = delivered, ✓✓ = read</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-1">🤖 AI Fun & Commands</h3>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span><strong>/roast</strong> — Roast the chat</span>
              <span><strong>/meme</strong> — Generate a meme caption</span>
              <span><strong>/expose @user</strong> — Expose funny chat moments</span>
              <span><strong>/glitch</strong> — Trigger glitch effect</span>
              <span><strong>/rain</strong> — Trigger rain effect</span>
              <span><strong>/poll</strong> — Create interactive poll</span>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-1">💡 Tips & Tricks</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li><strong>Long-press</strong> any message to quickly react with emojis</li>
              <li><strong>Hover</strong> over a message to see its exact timestamp</li>
              <li>Type <strong>/</strong> in the input to browse all commands</li>
              <li>Mention <strong>@Bakait</strong> to chat directly with the AI</li>
              <li>Click <strong>+</strong> to find users or create group chats</li>
              <li>Green dot = <strong>online now</strong> (active in last 2 minutes)</li>
              <li>Click profile avatar to see stats and achievements</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
