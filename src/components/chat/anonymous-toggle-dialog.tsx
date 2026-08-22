"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Ghost, Check, Sparkles, UserCheck } from "lucide-react"

export interface AnonymousPersona {
  id: string
  name: string
  emoji: string
  tagline: string
}

export const COLLEGE_PERSONAS: AnonymousPersona[] = [
  { id: "canteen_samosa", name: "Canteen Samosa", emoji: "☕", tagline: "Always found near the tea stall" },
  { id: "backbench_legend", name: "Backbench Legend", emoji: "😴", tagline: "Sleeping since 9 AM lecture" },
  { id: "cgpa_maggu", name: "9.9 CGPA Maggu", emoji: "📚", tagline: "Asks for extra sheet in midterms" },
  { id: "onesided_lover", name: "One-Sided Lover", emoji: "💔", tagline: "Staring at crush from 3rd row" },
  { id: "fortuner_senior", name: "Fortuner Senior", emoji: "🚗", tagline: "Parks on canteen footpath" },
  { id: "proxy_master", name: "Proxy Master", emoji: "🎒", tagline: "Answers attendance for 4 friends" },
  { id: "placement_target", name: "Mass Recruiter Target", emoji: "🎓", tagline: "Aptitude test warrior" },
]

export function AnonymousToggleDialog({
  conversationId,
}: {
  conversationId: string
}) {
  const [open, setOpen] = useState(false)
  const [activePersona, setActivePersona] = useState<AnonymousPersona | null>(null)
  const storageKey = `bakaiti_anon_mode_${conversationId}`

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setActivePersona(JSON.parse(saved))
      }
    } catch {}
  }, [storageKey])

  const selectPersona = (persona: AnonymousPersona) => {
    setActivePersona(persona)
    try {
      localStorage.setItem(storageKey, JSON.stringify(persona))
    } catch {}
    window.dispatchEvent(new Event(`bakaiti_anon_update_${conversationId}`))
    setOpen(false)
  }

  const disableAnon = () => {
    setActivePersona(null)
    try {
      localStorage.removeItem(storageKey)
    } catch {}
    window.dispatchEvent(new Event(`bakaiti_anon_update_${conversationId}`))
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={activePersona ? "default" : "outline"}
          className={`gap-1.5 ${
            activePersona
              ? "bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md animate-pulse"
              : "border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
          }`}
          title="Toggle Anonymous Mode"
        >
          <Ghost className="h-4 w-4" /> {activePersona ? activePersona.name : "Anon Mode"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <Ghost className="h-5 w-5 text-purple-500" /> Anonymous College Mode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Send messages under a hilarious college alias! Your real name, avatar, and profile link are 100% hidden from everyone.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose College Persona Alias</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {COLLEGE_PERSONAS.map((p) => {
                const isSelected = activePersona?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPersona(p)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/15 ring-2 ring-purple-500/40"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.emoji}</span>
                      <div>
                        <p className="text-sm font-bold">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.tagline}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-5 w-5 text-purple-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {activePersona && (
            <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={disableAnon}>
              <UserCheck className="h-4 w-4 mr-1.5" /> Turn Off Anonymous Mode (Use Real Profile)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
