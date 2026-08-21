"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { MessageCircle, LogOut, Users, Archive, UserRound, LogOutIcon, Trash2 } from "lucide-react"
import { NewActionsDialog } from "./new-actions-dialog"
import { ActivityDialog } from "./activity-dialog"
import { HelpDialog } from "./help-dialog"
import { useSidebar } from "./sidebar-context"
import { useNicknames } from "@/components/chat/use-nicknames"
import { useOnlineUsers } from "@/lib/realtime-presence"
import { RoundLoader } from "@/components/ui/round-loader"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Participant {
  id: string; name: string; avatar_url: string | null
}

interface ConversationItem {
  id: string
  type: string
  name: string | null
  adminId: string | null
  creatorId: string
  otherUser: { id: string; name: string; username: string; avatar_url: string | null; last_seen: string | null } | null
  participants: Participant[] | null
  lastMessage: { content: string; created_at: string; isMine: boolean; senderName?: string | null; audio_url?: string; image_url?: string; sticker_url?: string } | null
  unreadCount: number
}

const isOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 120000
}

const formatLastSeen = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return ""
  const diff = Date.now() - new Date(lastSeen).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function UserList({ onNav }: { onNav?: () => void }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [myProfile, setMyProfile] = useState<{ id: string; name: string; username: string; avatar_url: string | null } | null>(null)
  const [contextConversation, setContextConversation] = useState<ConversationItem | null>(null)
  const [contextError, setContextError] = useState("")
  const [contextLoading, setContextLoading] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = useMemo(() => createClient(), [])
  const { refreshKey } = useSidebar()
  const hasLoaded = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressNavigation = useRef(false)
  const nicknames = useNicknames()
  const onlineSet = useOnlineUsers()

  const openContextMenu = (conversation: ConversationItem) => {
    setContextError("")
    setContextConversation(conversation)
  }

  const startLongPress = (conversation: ConversationItem) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      suppressNavigation.current = true
      navigator.vibrate?.(25)
      openContextMenu(conversation)
    }, 550)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const hideConversation = async () => {
    if (!contextConversation) return
    setContextLoading(true); setContextError("")
    const response = await fetch("/api/conversations/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: contextConversation.id }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setContextError(result.error ?? "Could not hide chat")
    else {
      setConversations((items) => items.filter((item) => item.id !== contextConversation.id))
      setContextConversation(null)
      router.push("/chat")
      router.refresh()
    }
    setContextLoading(false)
  }

  const leaveGroup = async () => {
    if (!contextConversation) return
    if (!window.confirm(`Leave ${contextConversation.name ?? "this group"}?`)) return
    setContextLoading(true); setContextError("")
    const response = await fetch("/api/group/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: contextConversation.id }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setContextError(result.error ?? "Could not leave group")
    else {
      setConversations((items) => items.filter((item) => item.id !== contextConversation.id))
      setContextConversation(null)
      router.push("/chat")
      router.refresh()
    }
    setContextLoading(false)
  }

  const deleteGroup = async () => {
    if (!contextConversation) return
    if (!window.confirm(`Delete ${contextConversation.name ?? "this group"} for everyone? This cannot be undone.`)) return
    setContextLoading(true); setContextError("")
    const response = await fetch(`/api/group?conversationId=${encodeURIComponent(contextConversation.id)}`, { method: "DELETE" })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setContextError(result.error ?? "Could not delete group")
    else {
      setConversations((items) => items.filter((item) => item.id !== contextConversation.id))
      setContextConversation(null)
      router.push("/chat")
      router.refresh()
    }
    setContextLoading(false)
  }

  const load = useCallback(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((res) => {
        setConversations(res.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
      .finally(() => { hasLoaded.current = true })
  }, [])

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
  }, [supabase])

  useEffect(() => { load() }, [refreshKey, load])

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleLoad = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(load, 100)
    }
    const channel = supabase
      .channel("sidebar-conversation-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, scheduleLoad)
      .subscribe((status) => { if (status === "SUBSCRIBED") scheduleLoad() })

    const syncWhenVisible = () => { if (document.visibilityState === "visible") scheduleLoad() }
    window.addEventListener("online", scheduleLoad)
    document.addEventListener("visibilitychange", syncWhenVisible)
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      window.removeEventListener("online", scheduleLoad)
      document.removeEventListener("visibilitychange", syncWhenVisible)
      void supabase.removeChannel(channel)
    }
  }, [load, supabase])

  const onlineUsers = conversations
    .filter((c) => c.type !== "group" && c.otherUser && (isOnline(c.otherUser.last_seen) || onlineSet.has(c.otherUser.id)))
    .map((c) => c.otherUser!)
    .filter((u, i, arr) => arr.findIndex((a) => a.id === u.id) === i)
    .slice(0, 6)
  const visibleConversations = conversations.filter((conversation) => conversation.type === "group" || !!conversation.otherUser?.id)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 h-14 border-b flex-shrink-0">
        <button onClick={() => { onNav?.(); if (myProfile) router.push(`/profile/${myProfile.id}`) }} className="shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={myProfile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{myProfile?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
        </button>
        <h1 className="font-bold text-lg flex-1">Bakaiti</h1>
        <ActivityDialog />
        <NewActionsDialog />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center px-4 py-8">
            <RoundLoader size={24} />
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground">Click + to find someone and start chatting</p>
          </div>
        ) : (
          <div>
            {onlineUsers.length > 0 && (
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">Online Now</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {onlineUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/chat/${u.id}`}
                      onClick={() => onNav?.()}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8 ring-2 ring-green-500/50 group-hover:ring-green-500 transition-all">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">{u.name[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[48px] text-center leading-tight">
                        {u.name.split(" ")[0]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {visibleConversations.map((convo) => {
            const isGroup = convo.type === "group"
            const href = isGroup ? `/chat/group/${convo.id}` : `/chat/${convo.otherUser?.id}`
            const active = isGroup ? params?.conversationId === convo.id : params?.userId === convo.otherUser?.id
            const groupInitials = convo.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "G"
            const online = !isGroup && (isOnline(convo.otherUser?.last_seen) || (convo.otherUser ? onlineSet.has(convo.otherUser.id) : false))
            const displayName = !isGroup && convo.otherUser
              ? nicknames[convo.otherUser.id] ?? convo.otherUser.name
              : (convo.name ?? "Group")

            return (
              <Link
                key={convo.id}
                href={href}
                onClick={(event) => {
                  if (suppressNavigation.current) {
                    event.preventDefault()
                    suppressNavigation.current = false
                    return
                  }
                  onNav?.()
                }}
                onContextMenu={(event) => { event.preventDefault(); openContextMenu(convo) }}
                onTouchStart={() => startLongPress(convo)}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                onTouchMove={cancelLongPress}
                prefetch={true}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left block",
                  active && "bg-accent"
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative shrink-0">
                    {isGroup ? (
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {groupInitials}
                      </div>
                    ) : (
                      <>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={convo.otherUser?.avatar_url ?? undefined} />
                          <AvatarFallback>{convo.otherUser?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        {online && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {displayName}
                      </span>
                      {convo.unreadCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs truncate">
                      {online ? (
                        <span className="text-green-500">● Online</span>
                      ) : !isGroup && convo.otherUser?.last_seen ? (
                        <span className="text-muted-foreground">last seen {formatLastSeen(convo.otherUser.last_seen)}</span>
                      ) : convo.lastMessage ? (
                        <span className="text-muted-foreground">
                          {convo.lastMessage.isMine ? "You: " : isGroup && convo.lastMessage.senderName ? `${convo.lastMessage.senderName}: ` : ""}
                          {convo.lastMessage.sticker_url ? "sent a sticker" : convo.lastMessage.image_url ? "sent a photo" : convo.lastMessage.audio_url ? "🎤 Voice message" : (convo.lastMessage.content ?? "")}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {convo.unreadCount > 0 && (
                    <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                      {convo.unreadCount > 99 ? "99+" : convo.unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
          </div>
        )}
      </div>
      <div className="border-t p-2">
        <HelpDialog placement="footer" />
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push("/login")
            router.refresh()
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
      <Dialog open={!!contextConversation} onOpenChange={(open) => { if (!open) setContextConversation(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{contextConversation?.type === "group" ? contextConversation.name ?? "Group options" : contextConversation?.otherUser?.name ?? "Chat options"}</DialogTitle>
            <DialogDescription>Choose what you want to do with this conversation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            {contextConversation?.type !== "group" && contextConversation?.otherUser && (
              <Button variant="ghost" className="justify-start" onClick={() => { const id = contextConversation.otherUser?.id; setContextConversation(null); if (id) router.push(`/profile/${id}`) }}>
                <UserRound /> View profile
              </Button>
            )}
            <Button variant="ghost" className="justify-start" onClick={hideConversation} disabled={contextLoading}>
              <Archive /> Hide from chat list
            </Button>
            {contextConversation?.type === "group" && myProfile && (contextConversation.adminId === myProfile.id || contextConversation.creatorId === myProfile.id) ? (
              <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={deleteGroup} disabled={contextLoading}>
                <Trash2 /> Delete group
              </Button>
            ) : contextConversation?.type === "group" ? (
              <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={leaveGroup} disabled={contextLoading}>
                <LogOutIcon /> Leave group
              </Button>
            ) : null}
            {contextError && <p className="px-3 pt-2 text-sm text-destructive" role="alert">{contextError}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
