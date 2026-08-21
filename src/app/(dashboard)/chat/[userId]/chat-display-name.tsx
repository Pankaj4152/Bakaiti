"use client"

import { useNickname } from "@/components/chat/use-nickname"

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
  const displayName = nickname ?? name

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-semibold leading-tight truncate">{displayName}</span>
      {nickname && (
        <span className="text-[10px] text-muted-foreground leading-tight truncate hidden sm:inline">
          ({name})
        </span>
      )}
    </div>
  )
}