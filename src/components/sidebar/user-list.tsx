"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { MessageCircle, Archive } from "lucide-react"
import { AddUserDialog } from "./add-user-dialog"
import { useSidebar } from "./sidebar-context"

interface ConversationItem {
  id: string
  otherUser: { id: string; name: string; username: string; avatar_url: string | null } | null
  lastMessage: { content: string; created_at: string; isMine: boolean } | null
  unreadCount: number
}

export function UserList({ onNav }: { onNav?: () => void }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [myProfile, setMyProfile] = useState<{ id: string; name: string; username: string; avatar_url: string | null } | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const { refreshKey } = useSidebar()
  const hasLoaded = useRef(false)

  const load = () => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((res) => {
        setConversations(res.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
      .finally(() => { hasLoaded.current = true })
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return
      supabase
        .from("allowed_users")
        .select("id, name, username, avatar_url")
        .eq("email", user.email)
        .maybeSingle()
        .then(({ data }) => setMyProfile(data))
    })
  }, [])

  useEffect(() => { load() }, [refreshKey])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 h-14 border-b flex-shrink-0">
        <button onClick={() => { onNav?.(); myProfile && router.push(`/profile/${myProfile.id}`) }} className="shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={myProfile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{myProfile?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
        </button>
        <h1 className="font-bold text-lg flex-1">Bakaiti</h1>
        <button onClick={() => { onNav?.(); router.push("/vault") }} className="shrink-0 h-8 w-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors" title="The Vault">
          <Archive className="h-4 w-4" />
        </button>
        <AddUserDialog />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground p-4">Loading...</p>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground">Click + to find someone and start chatting</p>
          </div>
        ) : (
          conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => { onNav?.(); convo.otherUser && router.push(`/chat/${convo.otherUser.id}`) }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left",
                params?.userId === convo.otherUser?.id && "bg-accent"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={convo.otherUser?.avatar_url ?? undefined} />
                <AvatarFallback>{convo.otherUser?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {convo.otherUser?.name ?? "Unknown"}
                  </span>
                  {convo.unreadCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                {convo.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate">
                    {convo.lastMessage.isMine && "You: "}
                    {convo.lastMessage.content || "🎤 Voice message"}
                  </p>
                )}
              </div>
              {convo.unreadCount > 0 && (
                <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                  {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
