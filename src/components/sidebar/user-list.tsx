"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Search, Info, MessageCircle } from "lucide-react"
import type { User } from "@/types"

export function UserList() {
  const [results, setResults] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [activeChat, setActiveChat] = useState<User | null>(null)
  const [unread, setUnread] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        supabase.from("allowed_users").select("id").eq("email", user.email).maybeSingle().then(({ data }) => {
          if (data) setCurrentUserId(data.id)
        })
      }
    })
  }, [])

  useEffect(() => {
    if (!params?.userId) { setActiveChat(null); return }
    supabase.from("allowed_users").select("*").eq("id", params.userId).maybeSingle()
      .then(({ data }) => { if (data) setActiveChat(data) })
  }, [params?.userId])

  useEffect(() => {
    if (!currentUserId || !params?.userId) { setUnread(false); return }
    const ids = [currentUserId, params.userId as string].sort()
    supabase.from("conversations").select("id")
      .eq("user1_id", ids[0]).eq("user2_id", ids[1]).maybeSingle()
      .then(async ({ data: convo }) => {
        if (!convo) { setUnread(false); return }
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convo.id)
          .eq("read", false)
          .neq("sender_id", currentUserId)
        setUnread((count ?? 0) > 0)
      })
  }, [currentUserId, params?.userId])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = search.trim()
    if (q.length < 1) { setResults([]); return }

    timerRef.current = setTimeout(async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.email) return
      const { data } = await supabase
        .from("allowed_users")
        .select("*")
        .neq("email", authUser.email)
        .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
        .order("name")
      setResults(data ?? [])
    }, 200)
  }, [search])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeChat && (
          <>
            <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Chat
            </div>
            <button
              onClick={() => router.push(`/chat/${activeChat.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left bg-accent/50"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={activeChat.avatar_url ?? undefined} />
                <AvatarFallback>{activeChat.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                  {activeChat.name}
                  {unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unread messages" />}
                </div>
                {activeChat.username && (
                  <div className="text-xs text-muted-foreground truncate">@{activeChat.username}</div>
                )}
              </div>
              <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </>
        )}

        {search.length > 0 && (
          <>
            {activeChat && <div className="border-t my-1" />}
            <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Search Results
            </div>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No users found</p>
            ) : (
              results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => router.push(`/chat/${user.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left",
                    params?.userId === user.id && "bg-accent"
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{user.name}</div>
                    {user.username && (
                      <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                    )}
                  </div>
                  <span
                    onClick={(e) => { e.stopPropagation(); router.push(`/profile/${user.id}`) }}
                    className="shrink-0 p-1 rounded-md hover:bg-background transition-colors cursor-pointer inline-flex items-center justify-center"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); router.push(`/profile/${user.id}`) } }}
                    title="View profile"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              ))
            )}
          </>
        )}

        {!search && !activeChat && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center px-4">
              Search for someone to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
