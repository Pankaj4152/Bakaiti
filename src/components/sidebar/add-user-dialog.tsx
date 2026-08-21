"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"

type Profile = { id: string; name: string; username: string; avatar_url: string | null }

export function AddUserDialog({ open: controlledOpen, onOpenChange, showTrigger = true }: { open?: boolean; onOpenChange?: (open: boolean) => void; showTrigger?: boolean } = {}) {
  const [username, setUsername] = useState("")
  const [foundUser, setFoundUser] = useState<Profile | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const supabase = createClient()

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
    if (res.ok) { setFoundUser(null); setUsername("") }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setUsername(""); setFoundUser(null); setMessage("") } }}>
      {showTrigger && <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" title="Add friend"><Plus className="h-4 w-4" /></Button></DialogTrigger>}
      <DialogContent>
        <DialogHeader><DialogTitle>Friends</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-2"><Input placeholder="Exact username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") search() }} /><Button onClick={search} disabled={loading || !username.trim()}>{loading ? "..." : "Search"}</Button></div>
          {foundUser && <div className="flex items-center gap-3 rounded-lg border p-3"><User profile={foundUser} /><Button className="ml-auto" size="sm" onClick={sendRequest} disabled={loading}>Add friend</Button></div>}
          {message && <p className="text-center text-sm text-muted-foreground" role="status">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function User({ profile }: { profile: Profile }) {
  return <><Avatar className="h-9 w-9"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{profile.name[0]?.toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{profile.name}</p><p className="truncate text-xs text-muted-foreground">@{profile.username}</p></div></>
}
