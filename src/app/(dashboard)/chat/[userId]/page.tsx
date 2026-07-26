import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChatInput } from "./chat-input"
import { MessageList } from "./message-list"
import { MarkRead } from "./mark-read"

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email) redirect("/login")

  const { data: currentUser } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("email", authUser.email)
    .maybeSingle()

  if (!currentUser) redirect("/login")

  const { data: otherUser } = await supabase
    .from("allowed_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (!otherUser) redirect("/chat")

  const [user1Id, user2Id] = [currentUser.id, userId].sort()
  const { data: existingConvo } = await supabase
    .from("conversations")
    .select("id")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .maybeSingle()

  let conversationId: string
  if (existingConvo) {
    conversationId = existingConvo.id
  } else {
    const { data: newConvo } = await supabase
      .from("conversations")
      .insert({ user1_id: user1Id, user2_id: user2Id })
      .select("id")
      .single()
    conversationId = newConvo!.id
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*, sender:allowed_users(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  return (
    <>
      <MarkRead conversationId={conversationId} />
      <a
        href={`/profile/${userId}`}
        className="flex items-center gap-3 px-4 h-14 border-b flex-shrink-0 hover:bg-accent transition-colors"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherUser.avatar_url ?? undefined} />
          <AvatarFallback>{otherUser.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-semibold">{otherUser.name}</span>
      </a>
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
