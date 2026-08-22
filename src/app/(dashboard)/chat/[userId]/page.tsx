import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChatInput } from "./chat-input"
import { MessageList } from "./message-list"
import { MobileMenuButton } from "./chat-header"
import { ChatDisplayName } from "./chat-display-name"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { MediaButton } from "./media-button"
import { PresenceDot, PresenceStatus } from "./presence-status"
import { WallpaperDialog } from "@/components/chat/wallpaper-dialog"
import { AnonymousToggleDialog } from "@/components/chat/anonymous-toggle-dialog"

const getCurrentUser = cache(async (email: string) => {
  const supabase = await createClient()
  return supabase.from("allowed_users").select("id, theme").eq("email", email).maybeSingle()
})

const getOtherUser = cache(async (userId: string) => {
  const supabase = await createClient()
  return supabase.from("allowed_users").select("*").eq("id", userId).maybeSingle()
})

const getMessages = cache(async (conversationId: string, historyCutoff: string | null) => {
  const supabase = await createClient()
  let query = supabase
    .from("messages")
    .select("*, sender:allowed_users(*)")
    .eq("conversation_id", conversationId)
  if (historyCutoff) query = query.gt("created_at", historyCutoff)
  return query
    .order("created_at", { ascending: false })
    .limit(50)
})

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email) redirect("/login")

  const [{ data: currentUser }, { data: otherUser }] = await Promise.all([
    getCurrentUser(authUser.email),
    getOtherUser(userId),
  ])

  if (!currentUser) redirect("/login")
  if (!otherUser) redirect("/chat")

  const [user1Id, user2Id] = [currentUser.id, userId].sort()

  const { data: friendship } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("status", "accepted")
    .or(`and(requester_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(requester_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
    .maybeSingle()

  const { data: existingConvo } = await supabase
    .from("conversations")
    .select("id")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle()

  const conversationId = existingConvo?.id
  if (!conversationId) redirect("/chat")

  const { data: deletedChat } = await supabase
    .from("deleted_conversations")
    .select("deleted_at")
    .eq("user_id", currentUser.id)
    .eq("conversation_id", conversationId)
    .maybeSingle()
  const historyCutoff = deletedChat?.deleted_at ?? null
  const { data: messagesRaw } = await getMessages(conversationId, historyCutoff)
  const messages = (messagesRaw ?? []).reverse()

  const themeClass = currentUser.theme && currentUser.theme !== "default" ? `theme-${currentUser.theme}` : ""

  return (
    <div className={`flex flex-col h-full ${themeClass}`}>
      <div className="flex items-center gap-1 px-2 h-14 border-b flex-shrink-0">
        <MobileMenuButton />
        <Link
          href={`/profile/${userId}`}
          className="flex items-center gap-3 px-2 h-full flex-1 hover:bg-accent transition-colors rounded min-w-0"
        >
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser.avatar_url ?? undefined} />
              <AvatarFallback>{otherUser.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <PresenceDot userId={userId} lastSeen={otherUser.last_seen} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <ChatDisplayName userId={userId} name={otherUser.name} />
            <span className="text-[11px] text-muted-foreground leading-tight truncate">
              <PresenceStatus userId={userId} lastSeen={otherUser.last_seen} statusText={otherUser.status_text} />
            </span>
          </div>
          <TypingIndicator conversationId={conversationId} otherUserId={userId} />
        </Link>
        <AnonymousToggleDialog conversationId={conversationId} />
        <WallpaperDialog conversationId={conversationId} />
        <MediaButton conversationId={conversationId} historyCutoff={historyCutoff} />
      </div>
      <MessageList
        messages={messages ?? []}
        currentUserId={currentUser.id}
        conversationId={conversationId}
        readOnly={!friendship}
        historyCutoff={historyCutoff}
      />
      {friendship ? (
        <ChatInput conversationId={conversationId} senderId={currentUser.id} />
      ) : (
        <div className="border-t bg-muted/40 px-4 py-3 text-center">
          <p className="text-sm font-medium">You are no longer friends</p>
          <p className="text-xs text-muted-foreground">You can read this chat history. Send a friend request to start messaging again.</p>
        </div>
      )}
    </div>
  )
}
