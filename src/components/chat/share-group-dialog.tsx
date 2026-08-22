"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Share2, Copy, Check, Link as LinkIcon, Shield } from "lucide-react"

export function ShareGroupDialog({
  conversationId,
  groupName,
}: {
  conversationId: string
  groupName: string
}) {
  const [open, setOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const groupLink = typeof window !== "undefined" ? `${window.location.origin}/chat/group/${conversationId}` : `/chat/group/${conversationId}`

  const copyLink = () => {
    navigator.clipboard.writeText(groupLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const copyId = () => {
    navigator.clipboard.writeText(conversationId)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 hover:opacity-80 transition-opacity text-left min-w-0" title="Click to share group link & ID">
          <span className="font-semibold truncate max-w-[150px] sm:max-w-[220px]">{groupName}</span>
          <Share2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" /> Share Group & Join Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Group Name</p>
            <p className="text-base font-bold truncate">{groupName}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" /> Group Invite Link
            </label>
            <div className="flex gap-2">
              <Input value={groupLink} readOnly className="text-xs font-mono" />
              <Button size="sm" onClick={copyLink} className="shrink-0 gap-1.5">
                {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Group ID
            </label>
            <div className="flex gap-2">
              <Input value={conversationId} readOnly className="text-xs font-mono" />
              <Button size="sm" variant="outline" onClick={copyId} className="shrink-0 gap-1.5">
                {copiedId ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copiedId ? "Copied!" : "Copy ID"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
