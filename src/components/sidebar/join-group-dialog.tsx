"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, Link as LinkIcon, Loader2, ArrowRight } from "lucide-react"
import { useSidebar } from "@/components/sidebar/sidebar-context"

export function JoinGroupDialog({
  showTrigger = true,
}: {
  showTrigger?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [groupId, setGroupId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { refreshConversations } = useSidebar()

  const handleJoin = async () => {
    if (!groupId.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: groupId.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to join group")
        setLoading(false)
        return
      }

      refreshConversations()
      setOpen(false)
      setGroupId("")
      router.push(`/chat/group/${data.conversationId}`)
      router.refresh()
    } catch {
      setError("Network error joining group")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <button className="shrink-0 h-8 w-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground" title="Join Group by ID or Link">
            <UserPlus className="h-4 w-4" />
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Join Group via ID / Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Paste a group invite link or enter the Group ID to join the group instantly!
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" /> Group ID or Invite Link
            </label>
            <Input
              placeholder="e.g. 8f921a4e-..."
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>

          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

          <Button className="w-full font-bold gap-2" onClick={handleJoin} disabled={loading || !groupId.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? "Joining Group..." : "Join Group Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
