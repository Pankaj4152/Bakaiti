"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Trophy, Clock, Vote, CheckCircle2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { sounds } from "@/lib/sounds"

export interface NicknameCandidate {
  id: string
  name: string
  suggested_by: string
  votes: string[]
}

export interface NicknameBattleData {
  id: string
  conversation_id: string
  target_user_id: string
  target_user_name: string
  started_by: string
  ends_at: number
  candidates: NicknameCandidate[]
  finalized: boolean
}

export function NicknameBattleCard({
  conversationId,
  currentUserId,
}: {
  conversationId: string
  currentUserId: string
}) {
  const [activeBattle, setActiveBattle] = useState<NicknameBattleData | null>(null)
  const [voted, setVoted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()
  const storageKey = `bakaiti_nickname_battle_${conversationId}`

  useEffect(() => {
    const checkBattle = () => {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const battle: NicknameBattleData = JSON.parse(raw)
          const remaining = Math.max(0, Math.floor((battle.ends_at - Date.now()) / 1000))
          const userVoted = battle.candidates.some((c) => c.votes.includes(currentUserId))
          if (remaining > 0 && !userVoted && !battle.finalized) {
            setActiveBattle(battle)
            setVoted(false)
            setTimeLeft(remaining)
          } else {
            setActiveBattle(null)
          }
        }
      } catch {}
    }

    checkBattle()
    const handleSync = () => checkBattle()
    window.addEventListener(`bakaiti_battle_update_${conversationId}`, handleSync)
    return () => window.removeEventListener(`bakaiti_battle_update_${conversationId}`, handleSync)
  }, [conversationId, currentUserId, storageKey])

  useEffect(() => {
    if (!activeBattle) return
    const update = () => {
      const rem = Math.max(0, Math.floor((activeBattle.ends_at - Date.now()) / 1000))
      setTimeLeft(rem)
      if (rem <= 0) {
        setActiveBattle(null)
      }
    }
    timerRef.current = setInterval(update, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeBattle])

  const handleVote = (candidateId: string) => {
    if (!activeBattle) return
    const updatedCandidates = activeBattle.candidates.map((c) => {
      if (c.id === candidateId) {
        return { ...c, votes: [...c.votes, currentUserId] }
      }
      return c
    })

    const updated: NicknameBattleData = { ...activeBattle, candidates: updatedCandidates }
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch {}

    window.dispatchEvent(new Event(`bakaiti_battle_update_${conversationId}`))
    setVoted(true)
    sounds.playSentSound()

    // CLOSE / DISAPPEAR IMMEDIATELY UPON VOTING AS REQUESTED
    setTimeout(() => {
      setActiveBattle(null)
    }, 400)
  }

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (!activeBattle || dismissed) return null

  return (
    <div className="mx-4 my-2 p-3.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-amber-500/50 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase tracking-wider">
          <Trophy className="h-4 w-4 text-amber-500 animate-bounce" /> Nickname Battle: {activeBattle.target_user_name}
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

      <p className="text-xs text-muted-foreground mb-3">Vote on their new group nickname! (Popup closes on vote)</p>

      {voted ? (
        <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/30 animate-in zoom-in-95">
          <CheckCircle2 className="h-4 w-4" /> Vote Saved! Closing...
        </div>
      ) : (
        <div className="space-y-2">
          {activeBattle.candidates.map((cand) => (
            <Button
              key={cand.id}
              variant="outline"
              size="sm"
              onClick={() => handleVote(cand.id)}
              className="w-full justify-between text-xs border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/20 font-medium py-2 h-auto text-left"
            >
              <span className="font-semibold text-foreground">{cand.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Vote className="h-3 w-3" /> {cand.votes.length} votes
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
