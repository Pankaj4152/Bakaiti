"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Users } from "lucide-react"

interface UserItem {
  id: string
  name: string
  username: string
  avatar_url: string | null
}

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [users, setUsers] = useState<UserItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
  }, [open])

  const toggleUser = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const create = async () => {
    if (!name.trim() || selected.length < 2) return
    setLoading(true)
    setError("")
    const res = await fetch("/api/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), participantIds: selected }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || "Failed to create group")
      setLoading(false)
      return
    }
    setOpen(false)
    router.push(`/chat/group/${data.id}`)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="shrink-0 h-8 w-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors" title="Create Group">
          <Users className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <p className="text-xs text-muted-foreground">Add members (select at least 2)</p>
            {users.map((u) => {
              const isSelected = selected.includes(u.id)
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left ${
                    isSelected ? "bg-primary/10" : "hover:bg-accent"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{u.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    {u.username && <p className="text-xs text-muted-foreground truncate">@{u.username}</p>}
                  </div>
                  <div className={`h-4 w-4 rounded border-2 transition-colors ${
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" onClick={create} disabled={loading || !name.trim() || selected.length < 2}>
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
