"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, Info, Shield, UserPlus, UserMinus, Crown, Check, Loader2, Trash2, LogOut, Ghost } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSidebar } from "@/components/sidebar/sidebar-context"

interface GroupMember {
  id: string
  name: string
  username: string
  avatar_url?: string | null
}

export function GroupSettingsDialog({
  conversationId,
  groupName,
  isAnonGroup = false,
}: {
  conversationId: string
  groupName: string
  isAnonGroup?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(groupName)
  const [isOwner, setIsOwner] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [availableFriends, setAvailableFriends] = useState<GroupMember[]>([])
  const [addingMembers, setAddingMembers] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { refreshConversations } = useSidebar()



  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/group?conversationId=${encodeURIComponent(conversationId)}`)
      const data = await res.json()
      if (res.ok && data.group) {
        setName(data.group.name)
        setIsOwner(data.group.isOwner)
        setAdminId(data.group.adminId)
        setMembers(data.group.members ?? [])
      }
    } catch {
      setError("Failed to load group details")
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      if (res.ok && data.users) {
        const memberIds = new Set(members.map((m) => m.id))
        setAvailableFriends((data.users as GroupMember[]).filter((u) => !memberIds.has(u.id)))
      }
    } catch {}
  }

  useEffect(() => {
    if (open) {
      void loadData()
    }
  }, [open, conversationId])

  const handleUpdateName = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, name: name.trim() }),
      })
      if (!res.ok) throw new Error()
      refreshConversations()
    } catch {
      setError("Failed to update name")
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, addIds: [userId] }),
      })
      if (!res.ok) throw new Error()
      await loadData()
      setAddingMembers(false)
      refreshConversations()
    } catch {
      setError("Failed to add member")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return
    setLoading(true)
    try {
      const res = await fetch("/api/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, removeIds: [userId] }),
      })
      if (!res.ok) throw new Error()
      await loadData()
      refreshConversations()
    } catch {
      setError("Failed to remove member")
    } finally {
      setLoading(false)
    }
  }

  const handleMakeAdmin = async (userId: string) => {
    if (!confirm("Transfer admin rights to this member?")) return
    setLoading(true)
    try {
      const res = await fetch("/api/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, newAdminId: userId }),
      })
      if (!res.ok) throw new Error()
      await loadData()
      refreshConversations()
    } catch {
      setError("Failed to transfer admin")
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!confirm("Leave this group?")) return
    setLoading(true)
    try {
      const res = await fetch("/api/group/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      })
      if (!res.ok) throw new Error()
      refreshConversations()
      setOpen(false)
      router.push("/chat")
    } catch {
      setError("Failed to leave group")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!confirm("Delete group permanently? This cannot be undone.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/group?conversationId=${encodeURIComponent(conversationId)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      refreshConversations()
      setOpen(false)
      router.push("/chat")
    } catch {
      setError("Failed to delete group")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={isOwner ? "Group Settings" : "Group Info"}>
          {isOwner ? <Settings className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOwner ? <Shield className="h-5 w-5 text-primary" /> : <Info className="h-5 w-5 text-primary" />}
            {isOwner ? "Group Settings" : "Group Info"}
          </DialogTitle>
        </DialogHeader>

        {loading && members.length === 0 ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Group Name & Icon */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Name</label>
              {isOwner ? (
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Group Name"
                  />
                  <Button size="sm" onClick={handleUpdateName} disabled={loading || name === groupName}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-xl border bg-muted/40 font-bold text-sm text-foreground flex items-center justify-between">
                  <span>{groupName}</span>
                  <span className="text-xs text-muted-foreground font-normal">{members.length} members</span>
                </div>
              )}
            </div>

            {/* ANONYMOUS GROUP SAFE MEMBERS VIEW */}
            {isAnonGroup ? (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2 text-center">
                <div className="flex justify-center">
                  <div className="h-10 w-10 rounded-full bg-purple-900/60 flex items-center justify-center text-xl">
                    🎭
                  </div>
                </div>
                <h4 className="font-bold text-sm text-purple-300">Anonymous Group</h4>
                <p className="text-xs text-muted-foreground">
                  Member identities, profiles, and names are completely hidden to preserve 100% anonymity.
                </p>
                <div className="pt-2 flex justify-center items-center gap-2 text-xs font-semibold text-purple-400">
                  <Ghost className="h-4 w-4" /> Total Anonymous Members: {members.length}
                </div>
              </div>
            ) : (
              /* STANDARD GROUP MEMBERS VIEW */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Members ({members.length})
                  </label>
                  {isOwner && !addingMembers && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setAddingMembers(true)
                        void loadFriends()
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Add Member
                    </Button>
                  )}
                </div>

                {addingMembers && (
                  <div className="p-3 border rounded-lg space-y-2 bg-muted/40 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Select a friend to add:</span>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAddingMembers(false)}>
                        Cancel
                      </Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {availableFriends.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2 text-center">No available friends to add</p>
                      ) : (
                        availableFriends.map((friend) => (
                          <div key={friend.id} className="flex items-center justify-between p-1.5 hover:bg-background rounded-md">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={friend.avatar_url ?? undefined} />
                                <AvatarFallback className="text-xs">{friend.name[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{friend.name}</span>
                            </div>
                            <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleAddMember(friend.id)}>
                              Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-border/40">
                  {members.map((member) => {
                    const isAdmin = member.id === adminId
                    return (
                      <div key={member.id} className="flex items-center justify-between pt-2 pb-1">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{member.name[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium">{member.name}</span>
                              {isAdmin && (
                                <span className="flex items-center gap-0.5 text-[10px] bg-amber-500/20 text-amber-500 font-semibold px-1.5 py-0.5 rounded-full">
                                  <Crown className="h-3 w-3 fill-amber-500" /> Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">@{member.username}</span>
                          </div>
                        </div>

                        {isOwner && !isAdmin && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-amber-500 hover:text-amber-600"
                              title="Make Admin"
                              onClick={() => handleMakeAdmin(member.id)}
                            >
                              <Crown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Remove Member"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="pt-3 border-t flex flex-col gap-2">
              {!isOwner && (
                <Button variant="outline" size="sm" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleLeaveGroup}>
                  <LogOut className="h-4 w-4" /> Leave Group
                </Button>
              )}
              {isOwner && (
                <Button variant="destructive" size="sm" className="w-full gap-2" onClick={handleDeleteGroup}>
                  <Trash2 className="h-4 w-4" /> Delete Group
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
