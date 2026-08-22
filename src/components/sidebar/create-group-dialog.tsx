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
import { Users, Ghost, Lock, Globe, Key } from "lucide-react"

interface UserItem {
  id: string
  name: string
  username: string
  avatar_url: string | null
}

export function CreateGroupDialog({ open: controlledOpen, onOpenChange, showTrigger = true }: { open?: boolean; onOpenChange?: (open: boolean) => void; showTrigger?: boolean } = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [name, setName] = useState("")
  const [isAnonGroup, setIsAnonGroup] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState("")
  const [search, setSearch] = useState("")
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

  const query = search.trim().toLowerCase()
  const filtered = users.filter((u) => {
    const selectedMatch = selected.includes(u.id)
    if (selectedMatch) return true
    if (!query) return false
    return (
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query)
    )
  })

  const create = async () => {
    if (!name.trim() || (selected.length < 1 && !isPrivate)) return
    setLoading(true)
    setError("")
    const res = await fetch("/api/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: isAnonGroup ? `🎭 ${name.trim()}` : name.trim(),
        participantIds: selected,
        isAnon: isAnonGroup,
        isPrivate,
        password: isPrivate ? password.trim() : undefined,
      }),
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
      {showTrigger && (
        <DialogTrigger asChild>
          <button className="shrink-0 h-8 w-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors" title="Create Group">
            <Users className="h-4 w-4" />
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Create New Group
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            placeholder="Group name (e.g. Canteen Bakchodi)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsAnonGroup(false)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                !isAnonGroup ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent text-muted-foreground"
              }`}
            >
              <Users className="h-4 w-4" /> Standard Group
            </button>
            <button
              onClick={() => setIsAnonGroup(true)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isAnonGroup ? "border-purple-500 bg-purple-500/15 text-purple-400" : "border-border hover:bg-accent text-muted-foreground"
              }`}
            >
              <Ghost className="h-4 w-4" /> Anonymous Group 🎭
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/40">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="h-4 w-4 text-amber-500" /> : <Globe className="h-4 w-4 text-emerald-500" />}
              <div>
                <p className="text-xs font-semibold">{isPrivate ? "Private Group (Password)" : "Public Group"}</p>
                <p className="text-[10px] text-muted-foreground">{isPrivate ? "Requires password to join via link" : "Anyone with link can join"}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPrivate(!isPrivate)}
              className="h-7 text-xs"
            >
              {isPrivate ? "Make Public" : "Make Private"}
            </Button>
          </div>

          {isPrivate && (
            <div className="space-y-1 animate-in fade-in">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Set Group Join Password</label>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter group password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <Input
            placeholder="Search people to add..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground">Add initial members</p>
            {filtered.map((u) => {
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
          <Button className="w-full font-bold" onClick={create} disabled={loading || !name.trim()}>
            {loading ? "Creating Group..." : `Create ${isAnonGroup ? "Anonymous" : ""} Group`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
