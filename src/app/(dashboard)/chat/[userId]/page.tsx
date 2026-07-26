import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChatInput } from "./chat-input"
import { MessageList } from "./message-list"
import { MarkRead } from "./mark-read"
import { MobileMenuButton } from "./chat-header"

const getCurrentUser = cache(async (email: string) => {
  const supabase = await createClient()
  return supabase.from("allowed_users").select("id").eq("email", email).maybeSingle()
})

const getOtherUser = cache(async (userId: string) => {
  const supabase = await createClient()
  return supabase.from("allowed_users").select("*").eq("id", userId).maybeSingle()
})

const getOrCreateConversation = cache(async (user1: string, user2: string) => {
  const supabase = await createClient()
  const [user1Id, user2Id] = [user1, user2].sort()
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase
    .from("conversations")
    .insert({ user1_id: user1Id, user2_id: user2Id })
    .select("id")
    .single()
  return created!.id
})

const getMessages = cache(async (conversationId: string) => {
  const supabase = await createClient()
  return supabase
    .from("messages")
    .select("*, sender:allowed_users(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
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

  const conversationId = await getOrCreateConversation(currentUser.id, userId)
  const { data: messages } = await getMessages(conversationId)

  return (
    <>
      <MarkRead conversationId={conversationId} />
      <div className="flex items-center gap-1 px-2 h-14 border-b flex-shrink-0">
        <MobileMenuButton />
        <a
          href={`/profile/${userId}`}
          className="flex items-center gap-3 px-2 h-full flex-1 hover:bg-accent transition-colors rounded"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={otherUser.avatar_url ?? undefined} />
            <AvatarFallback>{otherUser.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-semibold">{otherUser.name}</span>
        </a>
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
    </>
  )
}
