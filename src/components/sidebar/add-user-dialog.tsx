"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { useSidebar } from "./sidebar-context"

export function AddUserDialog() {
  const [username, setUsername] = useState("")
  const [foundUser, setFoundUser] = useState<{ id: string; name: string; username: string; avatar_url: string | null } | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { refreshConversations } = useSidebar()

  const search = async () => {
    const q = username.toLowerCase().trim()
    if (!q) return
    setLoading(true)
    setFoundUser(null)
    setNotFound(false)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser?.email) return

    const { data } = await supabase
      .from("allowed_users")
      .select("id, name, username, avatar_url")
      .eq("username", q)
      .neq("email", authUser.email)
      .maybeSingle()

    if (data) {
      setFoundUser(data)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  const startChat = () => {
    if (!foundUser) return
    setOpen(false)
    setUsername("")
    setFoundUser(null)
    refreshConversations()
    router.push(`/chat/${foundUser.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setUsername(""); setFoundUser(null); setNotFound(false) } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Add user">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Find a user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter exact username..."
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") search() }}
            />
            <Button onClick={search} disabled={loading || !username.trim()}>
              {loading ? "..." : "Search"}
            </Button>
          </div>

          {foundUser && (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={foundUser.avatar_url ?? undefined} />
                  <AvatarFallback>{foundUser.name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{foundUser.name}</p>
                  <p className="text-xs text-muted-foreground">@{foundUser.username}</p>
                </div>
              </div>
              <Button size="sm" onClick={startChat}>Chat</Button>
            </div>
          )}

          {notFound && (
            <p className="text-sm text-muted-foreground text-center">No user found with that username</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
