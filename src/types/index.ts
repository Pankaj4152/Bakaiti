export interface User {
  id: string
  email: string
  name: string
  username: string
  avatar_url: string | null
  status_text?: string | null
  bio?: string | null
  last_seen: string
  theme: string
  status: string
  created_at: string
}

export interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  last_message_at: string
  other_user?: User
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  audio_url: string | null
  image_url: string | null
  poll_id: string | null
  sticker_url: string | null
  is_ai: boolean
  read: boolean
  created_at: string
  reply_to_id?: string | null
  reply_to?: {
    id: string
    content: string | null
    sender?: { name: string } | null
    sender_name?: string
  } | null
  sender?: User
}

export interface Poll {
  id: string
  conversation_id: string
  question: string
  created_by: string
  created_at: string
  options: PollOption[]
}

export interface PollOption {
  id: string
  poll_id: string
  text: string
  votes: { user_id: string }[]
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface Memory {
  id: string
  conversation_id: string
  target_user_id: string
  type: MemoryType
  content: string
  context: string
  confidence: number
  created_at: string
}

export type MemoryType = "PROMISE" | "EXCUSE" | "LIE" | "EMBARRASSING" | "FUNNY" | "CONTRADICTION"

export interface LegendaryQuote {
  id: string
  user_id: string
  quote: string
  context: string
  rating: number
  created_at: string
}

export interface UserStats {
  messages_sent: number
  reply_time_avg: number | null
  ghost_count: number
  emoji_count: number
  startup_mentions: number
  late_night_count: number
  favorite_words: string[]
  top_emojis: string[]
  active_hours: Record<string, number>
  longest_streak: number
  conversation_starter_count: number
  question_count: number
}

export interface DailySummary {
  id: string
  conversation_id: string
  date: string
  content: {
    winner?: string
    most_active?: string
    funniest_quote?: string
    embarrassing_moment?: string
    biggest_argument?: string
    best_comeback?: string
    weirdest_conversation?: string
  }
  created_at: string
}
