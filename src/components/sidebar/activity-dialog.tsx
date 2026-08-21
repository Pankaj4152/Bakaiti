"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, UserCheck, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSidebar } from "./sidebar-context"

type Profile = { id: string; name: string; username: string; avatar_url: string | null }
type FriendRequest = { id: string; requester_id: string; recipient_id: string; status: string; created_at: string; responded_at: string | null; requester: Profile; recipient: Profile }

export function ActivityDialog() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { refreshConversations } = useSidebar()

  const load = useCallback(async () => {
    const response = await fetch("/api/friend-requests", { cache: "no-store" })
    const result = await response.json().catch(() => ({}))
    if (response.ok) {
      setRequests(result.data ?? [])
      setCurrentUserId(result.currentUserId ?? "")
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const channel = supabase.channel("friend-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => void load())
      .subscribe()
    const sync = () => { if (document.visibilityState === "visible") void load() }
    document.addEventListener("visibilitychange", sync)
    return () => { document.removeEventListener("visibilitychange", sync); void supabase.removeChannel(channel) }
  }, [load, supabase])

  const incoming = requests.filter((request) => request.status === "pending" && request.recipient_id === currentUserId)
  const sent = requests.filter((request) => request.status === "pending" && request.requester_id === currentUserId)
  const accepted = requests.filter((request) => request.status === "accepted").slice(0, 8)

  const respond = async (request: FriendRequest, action: "accept" | "reject") => {
    setLoading(true); setMessage("")
    const response = await fetch("/api/friend-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.id, action }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setMessage(result.error ?? "Could not update request")
    else {
      await load(); refreshConversations()
      if (action === "accept") { setOpen(false); router.push(`/chat/${request.requester_id}`) }
    }
    setLoading(false)
  }

  const cancelRequest = async (requestId: string) => {
    setLoading(true); setMessage("")
    const response = await fetch("/api/friend-requests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setMessage(result.error ?? "Could not cancel request")
    else await load()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) void load() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" title="Activity">
          <Heart className="h-4 w-4" />
          {incoming.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{incoming.length > 9 ? "9+" : incoming.length}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[82vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>Activity</DialogTitle><DialogDescription>Friend requests and your latest connections.</DialogDescription></DialogHeader>
        <div className="space-y-5 pt-1">
          {incoming.length > 0 && <Section title="Friend requests">{incoming.map((request) => <ActivityUser key={request.id} profile={request.requester}><div className="ml-auto flex gap-1.5"><Button size="sm" onClick={() => respond(request, "accept")} disabled={loading}>Accept</Button><Button size="sm" variant="ghost" onClick={() => respond(request, "reject")} disabled={loading}>Delete</Button></div></ActivityUser>)}</Section>}
          {sent.length > 0 && <Section title="Sent">{sent.map((request) => <ActivityUser key={request.id} profile={request.recipient}><div className="ml-auto flex items-center gap-1"><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Pending</span><Button size="sm" variant="ghost" onClick={() => cancelRequest(request.id)} disabled={loading}>Cancel</Button></div></ActivityUser>)}</Section>}
          {accepted.length > 0 && <Section title="Recent">{accepted.map((request) => { const friend = request.requester_id === currentUserId ? request.recipient : request.requester; return <ActivityUser key={request.id} profile={friend}><span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><UserCheck className="h-3.5 w-3.5" /> Friends</span></ActivityUser> })}</Section>}
          {!loading && incoming.length === 0 && sent.length === 0 && accepted.length === 0 && <div className="flex flex-col items-center py-10 text-center"><UserPlus className="mb-3 h-9 w-9 text-muted-foreground" /><p className="text-sm font-medium">Abhi koi nayi bakaiti nahi</p><p className="text-xs text-muted-foreground">New requests and connections will appear here.</p></div>}
          {loading && requests.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Loading activity...</p>}
          {message && <p className="text-center text-sm text-destructive" role="alert">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p><div className="space-y-1">{children}</div></section>
}

function ActivityUser({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent"><Avatar className="h-10 w-10"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{profile.name[0]?.toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.name}</p><p className="truncate text-xs text-muted-foreground">@{profile.username}</p></div>{children}</div>
}
