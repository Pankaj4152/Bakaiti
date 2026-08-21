import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"
import { computeUserStats, getAchievements, getFunLabels, type ComputedStats } from "@/lib/stats"
import { ProfileBackButton } from "./profile-header"
import { RemoveFriendButton } from "./remove-friend-button"

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
            </div>
            {isOwn && (
              <EditProfileDialog
                email={profile.email}
                currentName={profile.name}
                currentUsername={profile.username}
                currentAvatarUrl={profile.avatar_url}
                currentTheme={profile.theme}
              />
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
