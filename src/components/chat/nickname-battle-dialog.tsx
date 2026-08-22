"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trophy, Vote, Plus, Clock, Crown, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { sounds } from "@/lib/sounds"

export interface NicknameCandidate {
  id: string
  name: string
  suggested_by: string
  votes: string[] // userIds who voted for this
}

export interface NicknameBattle {
  id: string
  conversation_id: string
  target_user_id: string
  target_user_name: string
  started_by: string
  ends_at: number // timestamp ms
  candidates: NicknameCandidate[]
  finalized: boolean
}

const MEME_PRESETS = [
  "Canteen Chor ☕",
  "Padhaku Maggu 📚",
  "Late Latif ⏰",
  "Backbench King 👑",
  "Proxy Master 🎒",
  "One-Sided Lover 💔",
  "Mass Recruiter Target 🎯",
]

export function NicknameBattleDialog({
  conversationId,
  currentUserId,
  members = [],
}: {
  conversationId: string
  currentUserId: string
  members?: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; name: string } | null>(null)
  const [activeBattle, setActiveBattle] = useState<NicknameBattle | null>(null)
  const [customSuggestion, setCustomSuggestion] = useState("")
  const [timeLeft, setTimeLeft] = useState(120)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  // Sync active battle from localStorage / Realtime state per conversation
  const battleStorageKey = `bakaiti_nickname_battle_${conversationId}`

  useEffect(() => {
    const loadBattle = () => {
      try {
        const raw = localStorage.getItem(battleStorageKey)
        if (raw) {
          const battle: NicknameBattle = JSON.parse(raw)
          if (Date.now() < battle.ends_at && !battle.finalized) {
            setActiveBattle(battle)
          } else if (Date.now() >= battle.ends_at && !battle.finalized) {
            finalizeBattle(battle)
          }
        }
      } catch {}
    }
    loadBattle()
    const handleSync = () => loadBattle()
    window.addEventListener(`bakaiti_battle_update_${conversationId}`, handleSync)
    return () => window.removeEventListener(`bakaiti_battle_update_${conversationId}`, handleSync)
  }, [conversationId])

  // Timer countdown
  useEffect(() => {
    if (!activeBattle || activeBattle.finalized) return
    const updateTime = () => {
      const remaining = Math.max(0, Math.floor((activeBattle.ends_at - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0 && !activeBattle.finalized) {
        finalizeBattle(activeBattle)
      }
    }
    updateTime()
    timerRef.current = setInterval(updateTime, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeBattle])

  const broadcastBattleUpdate = (battle: NicknameBattle) => {
    try {
      localStorage.setItem(battleStorageKey, JSON.stringify(battle))
    } catch {}
    window.dispatchEvent(new Event(`bakaiti_battle_update_${conversationId}`))
  }

  const startTournament = (target: { id: string; name: string }) => {
    const battle: NicknameBattle = {
      id: `battle_${Date.now()}`,
      conversation_id: conversationId,
      target_user_id: target.id,
      target_user_name: target.name,
      started_by: currentUserId,
      ends_at: Date.now() + 120 * 1000, // 2 minutes
      candidates: MEME_PRESETS.slice(0, 3).map((p, i) => ({
        id: `cand_${i}`,
        name: p,
        suggested_by: "system",
        votes: [],
      })),
      finalized: false,
    }
    setActiveBattle(battle)
    broadcastBattleUpdate(battle)
    sounds.playSentSound()
  }

  const addCandidate = (name: string) => {
    if (!activeBattle || !name.trim()) return
    const cleanName = name.trim().slice(0, 30)
    if (activeBattle.candidates.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) return
    const newCand: NicknameCandidate = {
      id: `cand_${Date.now()}`,
      name: cleanName,
      suggested_by: currentUserId,
      votes: [currentUserId],
    }
    const updated: NicknameBattle = {
      ...activeBattle,
      candidates: [...activeBattle.candidates, newCand],
    }
    setActiveBattle(updated)
    broadcastBattleUpdate(updated)
    setCustomSuggestion("")
    sounds.playSentSound()
  }

  const voteCandidate = (candidateId: string) => {
    if (!activeBattle) return
    const updatedCandidates = activeBattle.candidates.map((c) => {
      const hasVoted = c.votes.includes(currentUserId)
      if (c.id === candidateId) {
        return {
          ...c,
          votes: hasVoted ? c.votes.filter((id) => id !== currentUserId) : [...c.votes, currentUserId],
        }
      }
      return c
    })
    const updated: NicknameBattle = { ...activeBattle, candidates: updatedCandidates }
    setActiveBattle(updated)
    broadcastBattleUpdate(updated)
    sounds.playReactionSound()
  }

  const finalizeBattle = async (battle: NicknameBattle) => {
    if (battle.finalized) return
    const sorted = [...battle.candidates].sort((a, b) => b.votes.length - a.votes.length)
    const winner = sorted[0]
    const finalizedBattle: NicknameBattle = { ...battle, finalized: true }
    setActiveBattle(null)
    localStorage.removeItem(battleStorageKey)
    window.dispatchEvent(new Event(`bakaiti_battle_update_${conversationId}`))

    if (winner && winner.name) {
      // Save winning nickname officially for target user
      try {
        await fetch("/api/nickname", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId: battle.target_user_id, nickname: winner.name }),
        })
        window.dispatchEvent(new Event("bakaiti:nickname-updated"))
      } catch {}

      // Insert announcement message into group chat
      const announcement = `👑 NICKNAME BATTLE FINISHED! ${battle.target_user_name} is officially crowned "${winner.name}" with ${winner.votes.length} votes! 🎉`
      try {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: announcement,
          is_ai: true,
        })
      } catch {}
    }
  }

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
          <Trophy className="h-4 w-4" /> Nickname Battle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <Trophy className="h-5 w-5" /> Group Nickname Battle
          </DialogTitle>
        </DialogHeader>

        {activeBattle && !activeBattle.finalized ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Voting on Nickname for</p>
                <p className="text-base font-bold text-foreground">{activeBattle.target_user_name}</p>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/20 px-3 py-1 rounded-full font-mono text-sm font-bold">
                <Clock className="h-4 w-4 animate-spin" /> {formatSecs(timeLeft)}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Candidate Nicknames</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeBattle.candidates.map((c) => {
                  const hasVoted = c.votes.includes(currentUserId)
                  return (
                    <div
                      key={c.id}
                      onClick={() => voteCandidate(c.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        hasVoted ? "border-amber-500 bg-amber-500/15" : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="text-sm font-medium">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">{c.votes.length} votes</span>
                        <Button size="sm" variant={hasVoted ? "default" : "outline"} className="h-7 px-2.5 text-xs">
                          <Vote className="h-3.5 w-3.5 mr-1" /> {hasVoted ? "Voted" : "Vote"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-2 border-t space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Add Candidate Suggestion</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Canteen Maggi, Padhaku..."
                  value={customSuggestion}
                  onChange={(e) => setCustomSuggestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCandidate(customSuggestion)}
                  maxLength={30}
                  className="text-xs"
                />
                <Button size="sm" onClick={() => addCandidate(customSuggestion)} disabled={!customSuggestion.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Nominate a group member for a 2-minute Nickname Tournament! Everyone votes on funny candidates, and the winner gets officially named in group chat!
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Member to Nominate</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedTarget(m)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      selectedTarget?.id === m.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                    }`}
                  >
                    <span className="text-sm font-medium">{m.name}</span>
                    {selectedTarget?.id === m.id && <Sparkles className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
              onClick={() => {
                if (selectedTarget) {
                  startTournament(selectedTarget)
                }
              }}
              disabled={!selectedTarget}
            >
              <Crown className="h-4 w-4 mr-2" /> Start 2-Min Nickname Battle
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
