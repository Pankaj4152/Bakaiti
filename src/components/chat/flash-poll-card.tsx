"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Zap, Clock, CheckCircle2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { sounds } from "@/lib/sounds"

export interface FlashPoll {
  id: string
  conversation_id: string
  question: string
  created_at: string
  created_by: string
  expires_at: number // timestamp ms
  options: { id: string; text: string; votes: string[] }[]
}

export function FlashPollCard({
  conversationId,
  currentUserId,
}: {
  conversationId: string
  currentUserId: string
}) {
  const [activePoll, setActivePoll] = useState<FlashPoll | null>(null)
  const [voted, setVoted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()
  const storageKey = `bakaiti_flash_poll_${conversationId}`

  useEffect(() => {
    const loadFlashPoll = () => {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const poll: FlashPoll = JSON.parse(raw)
          const remaining = Math.max(0, Math.floor((poll.expires_at - Date.now()) / 1000))
          const userVoted = poll.options.some((opt) => opt.votes.includes(currentUserId))
          if (remaining > 0 && !userVoted) {
            setActivePoll(poll)
            setVoted(false)
            setTimeLeft(remaining)
          } else {
            setActivePoll(null)
          }
        }
      } catch {}
    }

    loadFlashPoll()
    const handleSync = () => loadFlashPoll()
    window.addEventListener(`bakaiti_flash_poll_update_${conversationId}`, handleSync)
    return () => window.removeEventListener(`bakaiti_flash_poll_update_${conversationId}`, handleSync)
  }, [conversationId, currentUserId, storageKey])

  useEffect(() => {
    if (!activePoll) return
    const update = () => {
      const rem = Math.max(0, Math.floor((activePoll.expires_at - Date.now()) / 1000))
      setTimeLeft(rem)
      if (rem <= 0) {
        setActivePoll(null)
      }
    }
    timerRef.current = setInterval(update, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activePoll])

  const handleVote = (optionId: string) => {
    if (!activePoll) return
    const updatedOptions = activePoll.options.map((opt) => {
      if (opt.id === optionId) {
        return { ...opt, votes: [...opt.votes, currentUserId] }
      }
      return opt
    })

    const updatedPoll: FlashPoll = { ...activePoll, options: updatedOptions }
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedPoll))
    } catch {}

    window.dispatchEvent(new Event(`bakaiti_flash_poll_update_${conversationId}`))
    setVoted(true)
    sounds.playSentSound()
    setTimeout(() => {
      setActivePoll(null)
    }, 1200)
  }

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (!activePoll || dismissed) return null

  return (
    <div className="mx-4 my-2 p-3.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-2 border-amber-500/50 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase tracking-wider">
          <Zap className="h-4 w-4 fill-amber-500 text-amber-500 animate-bounce" /> 5-Min Flash Poll
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" /> {formatSecs(timeLeft)}
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setDismissed(true)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-sm font-bold text-foreground mb-3">{activePoll.question}</p>

      {voted ? (
        <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/30 animate-in zoom-in-95">
          <CheckCircle2 className="h-4 w-4" /> Vote Recorded! Closing...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {activePoll.options.map((opt) => (
            <Button
              key={opt.id}
              variant="outline"
              size="sm"
              onClick={() => handleVote(opt.id)}
              className="justify-between text-xs border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/20 font-medium py-2 h-auto"
            >
              <span className="truncate">{opt.text}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
