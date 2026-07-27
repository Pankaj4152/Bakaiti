import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChatInput } from "../../[userId]/chat-input"
import { MessageList } from "../../[userId]/message-list"
import { MarkRead } from "../../[userId]/mark-read"
import { MobileMenuButton } from "../../[userId]/chat-header"

const getConversation = cache(async (conversationId: string) => {
  const supabase = await createClient()
  return supabase
    .from("conversations")
    .select("id, name, type")
    .eq("id", conversationId)
    .maybeSingle()
})

const getParticipants = cache(async (conversationId: string) => {
  const supabase = await createClient()
  return supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
})

const getMessages = cache(async (conversationId: string) => {
  const supabase = await createClient()
  return supabase
    .from("messages")
    .select("*, sender:allowed_users(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
})

export default async function GroupConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email) redirect("/login")

  const { data: currentUser } = await supabase
    .from("allowed_users")
    .select("id, theme")
    .eq("email", authUser.email)
    .maybeSingle()

  if (!currentUser) redirect("/login")

  const [{ data: convo }, { data: participantRows }] = await Promise.all([
    getConversation(conversationId),
    getParticipants(conversationId),
  ])

  if (!convo || convo.type !== "group") redirect("/chat")

  const participantIds = participantRows?.map((p) => p.user_id) ?? []
  if (!participantIds.includes(currentUser.id)) redirect("/chat")

  const { data: allUsers } = await supabase
    .from("allowed_users")
    .select("id, name, avatar_url")
    .in("id", participantIds)

  const { data: messages } = await getMessages(conversationId)

  const themeClass = currentUser.theme && currentUser.theme !== "default" ? `theme-${currentUser.theme}` : ""
  const senderId = currentUser.id

  return (
    <div className={`flex flex-col h-full ${themeClass}`}>
      <MarkRead conversationId={conversationId} />
      <div className="flex items-center gap-1 px-2 h-14 border-b flex-shrink-0">
        <MobileMenuButton />
        <div className="flex items-center gap-2 px-2 flex-1">
          <div className="flex -space-x-2">
            {allUsers?.slice(0, 4).map((u) => (
              <Avatar key={u.id} className="h-7 w-7 border-2 border-background">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{u.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            {(allUsers?.length ?? 0) > 4 && (
              <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                +{allUsers!.length - 4}
              </div>
            )}
          </div>
          <span className="font-semibold">{convo.name ?? "Group"}</span>
        </div>
      </div>
      <MessageList
        messages={messages ?? []}
        currentUserId={currentUser.id}
        conversationId={conversationId}
      />
      <ChatInput
        conversationId={conversationId}
        senderId={senderId}
      />
    </div>
  )
}
