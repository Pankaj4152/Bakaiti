"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, MessageSquare, ExternalLink, Sparkles } from "lucide-react"
import Link from "next/link"

export interface UserProfilePreview {
  id: string
  name: string
  username?: string
  avatar_url?: string | null
  status_text?: string | null
  bio?: string | null
}

export function ProfilePreviewDialog({
  user,
  children,
}: {
  user: UserProfilePreview
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-2xl border bg-background/95 backdrop-blur-md">
        <div className="h-20 bg-gradient-to-r from-primary/30 via-purple-500/30 to-amber-500/30 w-full relative" />

        <div className="px-5 pb-5 -mt-10 space-y-3">
          <div className="flex justify-between items-end">
            <Avatar className="h-16 w-16 ring-4 ring-background shadow-md">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg font-bold">
                {user.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Link href={`/profile/${user.id}`} onClick={() => setOpen(false)}>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-full">
                <ExternalLink className="h-3.5 w-3.5" /> Full Profile
              </Button>
            </Link>
          </div>

          <div>
            <h3 className="font-bold text-base text-foreground leading-tight">{user.name}</h3>
            {user.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
          </div>

          {user.status_text && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-medium">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.status_text}</span>
            </div>
          )}

          {user.bio && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">About Me</p>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{user.bio}</p>
            </div>
          )}

          <div className="pt-2 border-t flex gap-2">
            <Link href={`/chat/${user.id}`} onClick={() => setOpen(false)} className="flex-1">
              <Button size="sm" className="w-full text-xs gap-1.5 font-bold">
                <MessageSquare className="h-3.5 w-3.5" /> Send DM
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
