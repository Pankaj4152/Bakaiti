import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChatInput } from "./chat-input"
import { MessageList } from "./message-list"
import { MarkRead } from "./mark-read"
import { MobileMenuButton } from "./chat-header"
import { ChatDisplayName } from "./chat-display-name"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { MediaButton } from "./media-button"
import { PresenceDot, PresenceStatus } from "./presence-status"

const getCurrentUser = cache(async (email: string) => {
  const supabase = await createClient()
  return supabase.from("allowed_users").select("id, theme").eq("email", email).maybeSingle()
})

const getOtherUser = cache(async (userId: string) => {
  const supabase = await createClient()
  return supabase.from("allowed_users").select("*").eq("id", userId).maybeSingle()
})

const getMessages = cache(async (conversationId: string) => {
  const supabase = await createClient()
  return supabase
    .from("messages")
    .select("*, sender:allowed_users(*)")
    .eq("conversation_id", conversationId)
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

  const { data: existingConvo } = await supabase
    .from("conversations")
    .select("id")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle()

  const conversationId = existingConvo?.id
  if (!conversationId) redirect("/chat")

  const { data: messagesRaw } = await getMessages(conversationId)
  const messages = (messagesRaw ?? []).reverse()

  const themeClass = currentUser.theme && currentUser.theme !== "default" ? `theme-${currentUser.theme}` : ""

  return (
    <div className={`flex flex-col h-full ${themeClass}`}>
      <MarkRead conversationId={conversationId} />
      <div className="flex items-center gap-1 px-2 h-14 border-b flex-shrink-0">
        <MobileMenuButton />
        <Link
          href={`/profile/${userId}`}
          className="flex items-center gap-3 px-2 h-full flex-1 hover:bg-accent transition-colors rounded"
        >
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser.avatar_url ?? undefined} />
              <AvatarFallback>{otherUser.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <PresenceDot userId={userId} lastSeen={otherUser.last_seen} />
          </div>
          <div className="flex flex-col min-w-0">
            <ChatDisplayName userId={userId} name={otherUser.name} />
            <span className="text-[11px] text-muted-foreground leading-tight">
              <PresenceStatus userId={userId} lastSeen={otherUser.last_seen} />
            </span>
          </div>
          <TypingIndicator conversationId={conversationId} otherUserId={userId} />
        </Link>
        <MediaButton conversationId={conversationId} />
      </div>
      <MessageList
        messages={messages ?? []}
        currentUserId={currentUser.id}
        conversationId={conversationId}
      />
      <ChatInput
        conversationId={conversationId}
        senderId={currentUser.id}
      />
    </div>
  )
}
