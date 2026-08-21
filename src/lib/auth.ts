import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface AuthUser {
  id: string
  email: string
  name: string
  username: string | null
  status: string
  theme?: string
  avatar_url?: string | null
}

// Resolve the authenticated session + profile. Returns null if not authed.
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("allowed_users")
    .select("id, email, name, username, status, theme, avatar_url")
    .eq("email", user.email.toLowerCase().trim())
    .maybeSingle()

  if (!profile) return null
  return profile as AuthUser
}

// Require a valid session. Returns a 401 NextResponse when unauthenticated.
export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  return { user, error: null }
}

// Verify an authenticated user is a participant of a conversation (DM or group).
export async function isConversationMember(userId: string, conversationId: string, requireActiveFriendship = true): Promise<boolean> {
  const admin = createAdminClient()
  const { data: convo } = await admin
    .from("conversations")
    .select("type, user1_id, user2_id")
    .eq("id", conversationId)
    .maybeSingle()

  if (!convo) return false
  if (convo.type === "dm" && (convo.user1_id === userId || convo.user2_id === userId)) {
    if (!requireActiveFriendship) return true
    const { data: friendship } = await admin
      .from("friend_requests")
      .select("id")
      .eq("status", "accepted")
      .or(`and(requester_id.eq.${convo.user1_id},recipient_id.eq.${convo.user2_id}),and(requester_id.eq.${convo.user2_id},recipient_id.eq.${convo.user1_id})`)
      .maybeSingle()
    return !!friendship
  }

  const { data: participant } = await admin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle()

  return !!participant
}
