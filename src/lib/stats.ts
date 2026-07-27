import { createAdminClient } from "./supabase/admin"

export interface ComputedStats {
  messages_sent: number
  emoji_reactions_given: number
  startup_mentions: number
  late_night_count: number
  top_emojis: { emoji: string; count: number }[]
  conversations_count: number
  average_message_length: number
}

export async function computeUserStats(userId: string): Promise<ComputedStats> {
  const db = createAdminClient()

  const [msgCount, reactionCount, startupCount, lateNightRes, emojis, convoAsU1, convoAsU2, groupPart, messages] =
    await Promise.all([
      db.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", userId),
      db.from("reactions").select("id", { count: "exact", head: true }).eq("user_id", userId),
      db.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", userId).ilike("content", "%startup%"),
      db.rpc("count_late_night_messages", { user_id: userId }),
      db.from("reactions").select("emoji").eq("user_id", userId),
      db.from("conversations").select("id", { count: "exact", head: true }).eq("user1_id", userId),
      db.from("conversations").select("id", { count: "exact", head: true }).eq("user2_id", userId).not("user2_id", "is", null),
      db.from("conversation_participants").select("conversation_id", { count: "exact", head: true }).eq("user_id", userId),
      db.from("messages").select("content").eq("sender_id", userId),
    ])

  const convoCount = (convoAsU1.count ?? 0) + (convoAsU2.count ?? 0) + (groupPart.count ?? 0)

  const emojiCounts: Record<string, number> = {}
  ;(emojis.data ?? []).forEach((r: { emoji: string }) => {
    emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1
  })
  const topEmojis = Object.entries(emojiCounts)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const contents = (messages.data ?? []).map((m: { content: string }) => m.content)
  const avgLength = contents.length > 0
    ? Math.round(contents.reduce((sum, c) => sum + c.length, 0) / contents.length)
    : 0

  return {
    messages_sent: msgCount.count ?? 0,
    emoji_reactions_given: reactionCount.count ?? 0,
    startup_mentions: startupCount.count ?? 0,
    late_night_count: (lateNightRes.data as number) ?? 0,
    top_emojis: topEmojis,
    conversations_count: convoCount,
    average_message_length: avgLength,
  }
}

export interface Achievement {
  emoji: string
  title: string
  description: string
}

export function getAchievements(stats: ComputedStats): Achievement[] {
  const achievements: Achievement[] = []

  if (stats.messages_sent >= 100) achievements.push({ emoji: "💬", title: "Chatterbox", description: "Sent 100+ messages" })
  if (stats.messages_sent >= 500) achievements.push({ emoji: "🏆", title: "Chat Lord", description: "Sent 500+ messages" })
  if (stats.emoji_reactions_given >= 50) achievements.push({ emoji: "😄", title: "Emoji Addict", description: "Gave 50+ reactions" })
  if (stats.startup_mentions >= 10) achievements.push({ emoji: "🚀", title: "CEO", description: "Mentioned 'startup' 10+ times" })
  if (stats.late_night_count >= 10) achievements.push({ emoji: "🦉", title: "Night Owl", description: "10+ late night messages" })
  if (stats.conversations_count >= 3) achievements.push({ emoji: "🌐", title: "Social Butterfly", description: "Chatted with 3+ people" })
  if (stats.average_message_length > 200) achievements.push({ emoji: "📖", title: "Novelist", description: "Average message over 200 chars" })
  if (stats.messages_sent > 0 && stats.average_message_length < 20) achievements.push({ emoji: "⚡", title: "Minimalist", description: "Short & sweet messages" })

  return achievements
}

export interface FunLabel {
  emoji: string
  label: string
}

export function getFunLabels(stats: ComputedStats): FunLabel[] {
  const labels: FunLabel[] = []

  if (stats.messages_sent > 0) labels.push({ emoji: "💬", label: "Most Active" })
  if (stats.emoji_reactions_given > 10) labels.push({ emoji: "😄", label: "Emoji Lover" })
  if (stats.startup_mentions > 5) labels.push({ emoji: "🚀", label: "CEO" })
  if (stats.late_night_count > 5) labels.push({ emoji: "🌙", label: "Night Owl" })
  if (stats.messages_sent > 0 && stats.average_message_length < 30) labels.push({ emoji: "✂️", label: "Dry Texter" })
  if (stats.average_message_length > 100) labels.push({ emoji: "📜", label: "Professional Yapper" })

  return labels
}
