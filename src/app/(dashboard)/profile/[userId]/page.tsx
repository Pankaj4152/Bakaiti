import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Users } from "lucide-react"
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"
import { computeUserStats, getAchievements, getFunLabels, type ComputedStats } from "@/lib/stats"
import { ProfileBackButton } from "./profile-header"
import { RemoveFriendButton } from "./remove-friend-button"
import { FriendsDialog } from "./friends-dialog"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const { data: profile } = await supabase
    .from("allowed_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (!profile) redirect("/chat")

  const isOwn = profile.email === user.email
  let friendshipId: string | null = null
  if (!isOwn) {
    const { data: currentProfile } = await supabase
      .from("allowed_users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle()

    if (currentProfile) {
      const { data: friendship } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("status", "accepted")
        .or(`and(requester_id.eq.${currentProfile.id},recipient_id.eq.${userId}),and(requester_id.eq.${userId},recipient_id.eq.${currentProfile.id})`)
        .maybeSingle()
      friendshipId = friendship?.id ?? null
    }
  }

  // Fetch accepted friends to display directly in Profile tab
  const { data: friendsData } = await supabase
    .from("friend_requests")
    .select("id, requester_id, recipient_id, requester:allowed_users!requester_id(id, name, username, avatar_url), recipient:allowed_users!recipient_id(id, name, username, avatar_url)")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)

  const friendsList = (friendsData ?? []).map((item: any) =>
    item.requester_id === userId ? item.recipient : item.requester
  ).filter(Boolean)

  let stats: ComputedStats
  try {
    stats = await computeUserStats(userId)
  } catch {
    stats = { messages_sent: 0, emoji_reactions_given: 0, startup_mentions: 0, late_night_count: 0, top_emojis: [], conversations_count: 0, average_message_length: 0 }
  }
  const achievements = getAchievements(stats)
  const labels = getFunLabels(stats)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-3 px-4 h-14 border-b">
        <ProfileBackButton />
        <span className="font-semibold">{profile.name}</span>
      </div>
      <div className="max-w-lg mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">
                {profile.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{profile.name}</h1>
              {profile.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
              {profile.status_text && (
                <div className="inline-flex items-center gap-1 mt-1.5 px-3 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                  {profile.status_text}
                </div>
              )}
              {profile.bio && (
                <p className="text-xs text-muted-foreground mt-2 max-w-xs italic">
                  "{profile.bio}"
                </p>
              )}
            </div>
            {isOwn && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <EditProfileDialog
                  email={profile.email}
                  currentName={profile.name}
                  currentUsername={profile.username}
                  currentAvatarUrl={profile.avatar_url}
                  currentStatusText={profile.status_text}
                  currentBio={profile.bio}
                  currentTheme={profile.theme}
                />
                <FriendsDialog />
              </div>
            )}
            {!isOwn && friendshipId && (
              <RemoveFriendButton friendshipId={friendshipId} friendName={profile.name} />
            )}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {labels.map((l) => (
                  <Badge key={l.label} variant="secondary" className="text-xs">
                    {l.emoji} {l.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Friends Card directly on Profile Tab */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Friends ({friendsList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {friendsList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No friends added yet.</p>
            ) : (
              <div className="space-y-2">
                {friendsList.map((friend: any) => (
                  <div key={friend.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <Link href={`/profile/${friend.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={friend.avatar_url ?? undefined} />
                        <AvatarFallback>{friend.name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{friend.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                      </div>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title={`Chat with ${friend.name}`}>
                      <Link href={`/chat/${friend.id}`}>
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Messages" value={stats.messages_sent.toString()} />
              <StatBox label="Reactions Given" value={stats.emoji_reactions_given.toString()} />
              <StatBox label="Conversations" value={stats.conversations_count.toString()} />
              <StatBox label="Avg Length" value={`${stats.average_message_length} chars`} />
              <StatBox label="Startup Mentions" value={stats.startup_mentions.toString()} />
              <StatBox label="Late Night" value={stats.late_night_count.toString()} />
            </div>
          </CardContent>
        </Card>

        {stats.top_emojis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Emojis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {stats.top_emojis.map((e) => (
                  <div key={e.emoji} className="flex items-center gap-1 text-sm">
                    <span className="text-lg">{e.emoji}</span>
                    <span className="text-muted-foreground">{e.count}x</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {achievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {achievements.map((a) => (
                  <div key={a.title} className="flex items-center gap-3 text-sm">
                    <span className="text-lg">{a.emoji}</span>
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-muted-foreground text-xs">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {isOwn ? (
            <Link href="/chat" className="underline hover:text-foreground">
              Back to chat
            </Link>
          ) : friendshipId ? (
            <Link href={`/chat/${userId}`} className="underline hover:text-foreground">
              Send a message
            </Link>
          ) : (
            <Link href="/chat" className="underline hover:text-foreground">
              Back to chat
            </Link>
          )}
        </p>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  )
}
