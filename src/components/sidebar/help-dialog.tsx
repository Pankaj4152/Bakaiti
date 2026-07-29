"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

export function HelpDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="shrink-0 h-8 w-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors" title="Help & Commands">
          <HelpCircle className="h-4 w-4" />
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
            <h3 className="font-semibold text-base mb-1">🤖 AI Fun</h3>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span><strong>/roast</strong> — Roast someone</span>
              <span><strong>/expose @user</strong> — Expose embarrassing messages</span>
              <span><strong>/chaos</strong> — Dramatic breaking news</span>
              <span><strong>/remember @user</strong> — Recall memories & quotes</span>
              <span><strong>/fortune</strong> — Random fortune</span>
              <span><strong>/mood</strong> — Analyze chat mood</span>
              <span><strong>/ghost-meter</strong> — Ghosting leaderboard</span>
              <span><strong>/simps</strong> — Reply speed leaderboard</span>
              <span><strong>/meme</strong> — Generate a meme caption</span>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-1">🎮 Effects</h3>
            <p className="text-muted-foreground"><strong>/confetti, /fireworks, /rain, /glitch</strong> — Trigger fun animations in the chat</p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-1">🔧 Utilities</h3>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span><strong>/calc &lt;expr&gt;</strong> — Calculator</span>
              <span><strong>/remind @user|me</strong> — Set a reminder</span>
              <span><strong>/poll "Q" "A" "B"</strong> — Create a poll</span>
              <span><strong>/spam &lt;msg&gt; &lt;N&gt;</strong> — Repeat a message</span>
              <span><strong>/help</strong> — Show this help</span>
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
              <li>Visit <strong>The Vault</strong> for AI-generated memories and daily recaps</li>
              <li>Green dot = <strong>online now</strong> (active in last 2 minutes)</li>
              <li>Click profile avatar to see stats and achievements</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
