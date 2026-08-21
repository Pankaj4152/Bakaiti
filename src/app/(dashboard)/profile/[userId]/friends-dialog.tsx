"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Profile = { id: string; name: string; username: string; avatar_url: string | null }
type Friendship = { id: string; requester_id: string; recipient_id: string; status: string; requester: Profile; recipient: Profile }

export function FriendsDialog() {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/friend-requests", { cache: "no-store" })
    const result = await response.json().catch(() => ({}))
    if (response.ok) {
      const currentUserId = result.currentUserId ?? ""
      setFriends((result.data ?? []).filter((item: Friendship) => item.status === "accepted").map((item: Friendship) => item.requester_id === currentUserId ? item.recipient : item.requester))
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) void load() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Users /> {loading ? "Friends" : `${friends.length} Friend${friends.length === 1 ? "" : "s"}`}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[82vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>Friends</DialogTitle><DialogDescription>Your bakaiti circle. Open a profile or jump into chat.</DialogDescription></DialogHeader>
        <div className="space-y-1 pt-1">
          {friends.map((friend) => (
            <div key={friend.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setOpen(false); router.push(`/profile/${friend.id}`) }}>
                <Avatar className="h-10 w-10"><AvatarImage src={friend.avatar_url ?? undefined} /><AvatarFallback>{friend.name[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{friend.name}</span><span className="block truncate text-xs text-muted-foreground">@{friend.username}</span></span>
              </button>
              <Button variant="ghost" size="icon" title={`Chat with ${friend.name}`} onClick={() => { setOpen(false); router.push(`/chat/${friend.id}`) }}><MessageCircle /></Button>
            </div>
          ))}
          {!loading && friends.length === 0 && <div className="py-10 text-center"><Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="text-sm font-medium">No friends yet</p><p className="text-xs text-muted-foreground">Use + in the chat sidebar to find someone.</p></div>}
          {loading && friends.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Loading friends...</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
