"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { useNickname } from "@/components/chat/use-nickname"
import { NicknameDialog } from "@/components/chat/nickname-dialog"

// Displays the other user's name (or the caller's custom nickname for them) in
// the DM chat header, with a small button to set/edit the nickname.
export function ChatDisplayName({
  userId,
  name,
}: {
  userId: string
  name: string
}) {
  const { nickname } = useNickname(userId)
  const [open, setOpen] = useState(false)
  const displayName = nickname ?? name

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-semibold leading-tight truncate">{displayName}</span>
      {nickname && (
        <span className="text-[10px] text-muted-foreground leading-tight truncate hidden sm:inline">
          {name}
        </span>
      )}
      <NicknameDialog
        targetUserId={userId}
        targetName={name}
        open={open}
        onOpenChange={setOpen}
        hideTrigger
      />
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Set nickname for ${name}`}
        title="Set nickname"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )
}