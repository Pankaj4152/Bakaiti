"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { useSidebar } from "./sidebar-context"

type Profile = { id: string; name: string; username: string; avatar_url: string | null }
type FriendRequest = { id: string; requester_id: string; recipient_id: string; status: string; requester: Profile; recipient: Profile }

export function AddUserDialog({ open: controlledOpen, onOpenChange, showTrigger = true }: { open?: boolean; onOpenChange?: (open: boolean) => void; showTrigger?: boolean } = {}) {
  const [username, setUsername] = useState("")
  const [foundUser, setFoundUser] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const router = useRouter()
  const supabase = createClient()
  const { refreshConversations } = useSidebar()

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/friend-requests", { cache: "no-store" })
    const json = await res.json()
    if (res.ok) { setRequests(json.data ?? []); setCurrentUserId(json.currentUserId ?? "") }
  }, [])

  const search = async () => {
    const q = username.toLowerCase().trim()
    if (!q) return
    setLoading(true); setFoundUser(null); setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("allowed_users").select("id, name, username, avatar_url").eq("username", q).neq("email", user?.email ?? "").maybeSingle()
    setFoundUser(data)
    if (!data) setMessage("No user found with that username")
    setLoading(false)
  }

  const sendRequest = async () => {
    if (!foundUser) return
    setLoading(true); setMessage("")
    const res = await fetch("/api/friend-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: foundUser.id }) })
    const json = await res.json()
    setMessage(res.ok ? "Friend request sent" : json.error ?? "Could not send request")
    if (res.ok) { setFoundUser(null); setUsername(""); await loadRequests() }
    setLoading(false)
  }

  const respond = async (requestId: string, action: "accept" | "reject", requesterId: string) => {
    setLoading(true); setMessage("")
    const res = await fetch("/api/friend-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action }) })
    const json = await res.json()
    if (!res.ok) setMessage(json.error ?? "Could not update request")
    else {
      await loadRequests(); refreshConversations()
      if (action === "accept") { setOpen(false); router.push(`/chat/${requesterId}`) }
    }
    setLoading(false)
  }

  const removeFriend = async (request: FriendRequest) => {
    const friend = request.requester_id === currentUserId ? request.recipient : request.requester
    if (!window.confirm(`Remove ${friend.name} from your friends? Your old chat will be kept.`)) return
    setLoading(true); setMessage("")
    const res = await fetch("/api/friend-requests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.id }) })
    const json = await res.json()
    setMessage(res.ok ? `${friend.name} removed from friends` : json.error ?? "Could not remove friend")
    if (res.ok) { await loadRequests(); refreshConversations(); router.refresh() }
    setLoading(false)
  }

  const incoming = requests.filter((r) => r.status === "pending" && r.recipient_id === currentUserId)
  const outgoing = requests.filter((r) => r.status === "pending" && r.requester_id === currentUserId)
  const friends = requests.filter((r) => r.status === "accepted")

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) void loadRequests(); else { setUsername(""); setFoundUser(null); setMessage("") } }}>
      {showTrigger && <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" title="Add friend"><Plus className="h-4 w-4" /></Button></DialogTrigger>}
      <DialogContent>
        <DialogHeader><DialogTitle>Friends</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          {incoming.length > 0 && <section className="space-y-2"><p className="text-xs font-semibold uppercase text-muted-foreground">Requests</p>{incoming.map((request) => <div key={request.id} className="flex items-center gap-3 rounded-lg border p-3"><User profile={request.requester} /><div className="ml-auto flex gap-2"><Button size="sm" onClick={() => respond(request.id, "accept", request.requester_id)} disabled={loading}>Accept</Button><Button size="sm" variant="ghost" onClick={() => respond(request.id, "reject", request.requester_id)} disabled={loading}>Reject</Button></div></div>)}</section>}
          {friends.length > 0 && <section className="space-y-2"><p className="text-xs font-semibold uppercase text-muted-foreground">Friends</p>{friends.map((request) => { const friend = request.requester_id === currentUserId ? request.recipient : request.requester; return <div key={request.id} className="flex items-center gap-3 rounded-lg border p-3"><User profile={friend} /><Button className="ml-auto" size="sm" variant="outline" onClick={() => removeFriend(request)} disabled={loading}>Remove</Button></div> })}</section>}
          <div className="flex gap-2"><Input placeholder="Exact username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") search() }} /><Button onClick={search} disabled={loading || !username.trim()}>{loading ? "..." : "Search"}</Button></div>
          {foundUser && <div className="flex items-center gap-3 rounded-lg border p-3"><User profile={foundUser} /><Button className="ml-auto" size="sm" onClick={sendRequest} disabled={loading}>Add friend</Button></div>}
          {outgoing.length > 0 && <section className="space-y-2"><p className="text-xs font-semibold uppercase text-muted-foreground">Sent</p>{outgoing.map((request) => <div key={request.id} className="flex items-center gap-3 rounded-lg border p-3"><User profile={request.recipient} /><span className="ml-auto text-xs text-muted-foreground">Pending</span></div>)}</section>}
          {message && <p className="text-center text-sm text-muted-foreground" role="status">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function User({ profile }: { profile: Profile }) {
  return <><Avatar className="h-9 w-9"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{profile.name[0]?.toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{profile.name}</p><p className="truncate text-xs text-muted-foreground">@{profile.username}</p></div></>
}
