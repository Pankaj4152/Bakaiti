"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Poll, PollOption } from "@/types"

export function PollCard({
  pollId,
  currentUserId,
}: {
  pollId: string
  currentUserId: string
}) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!pollId) return

    const load = async () => {
      const { data: pollData } = await supabase.from("polls").select("*").eq("id", pollId).single()
      if (!pollData) { setLoading(false); return }

      const { data: options } = await supabase.from("poll_options").select("id, poll_id, text").eq("poll_id", pollId)
      const { data: votes } = await supabase.from("poll_votes").select("id, option_id, user_id")

      const optMap: Record<string, PollOption> = {}
      if (options) for (const o of options) {
        optMap[o.id] = { ...o, votes: [] }
      }
      if (votes) for (const v of votes) {
        if (optMap[v.option_id]) optMap[v.option_id].votes.push({ user_id: v.user_id })
      }

      setPoll({ ...pollData, options: Object.values(optMap) })
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`poll:${pollId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [pollId])

  if (loading) return <div className="text-xs text-muted-foreground">Loading poll...</div>
  if (!poll) return null

  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0)
  const myVote = poll.options.find((o) => o.votes.some((v) => v.user_id === currentUserId))
  const maxVotes = Math.max(...poll.options.map((o) => o.votes.length), 1)

  const vote = async (optionId: string) => {
    await fetch("/api/poll/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId: poll.id, optionId }),
    })
  }

  return (
    <div className="min-w-[220px] max-w-[280px]">
      <p className="text-sm font-medium mb-2">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0
          const isMyVote = myVote?.id === option.id
          const barWidth = totalVotes > 0 ? (option.votes.length / maxVotes) * 100 : 0

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              className={cn(
                "relative w-full text-left px-3 py-2 rounded-lg border transition-colors overflow-hidden",
                isMyVote
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-accent"
              )}
            >
              <div
                className="absolute inset-0 bg-primary/10 transition-all"
                style={{ width: `${barWidth}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-sm">{option.text}</span>
                {totalVotes > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </div>
  )
}
