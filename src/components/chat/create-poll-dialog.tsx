"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart2, Zap, Plus, Trash2, Loader2 } from "lucide-react"
import { sounds } from "@/lib/sounds"

export function CreatePollDialog({
  conversationId,
  currentUserId,
  open,
  onOpenChange,
  initialMode = "standard",
}: {
  conversationId: string
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: "standard" | "flash"
}) {
  const [mode, setMode] = useState<"standard" | "flash">(initialMode)
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode, open])

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, text: string) => {
    const next = [...options]
    next[index] = text
    setOptions(next)
  }

  const handleCreate = async () => {
    const cleanQuestion = question.trim()
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean)

    if (!cleanQuestion) {
      setError("Please enter a poll question")
      return
    }
    if (cleanOptions.length < 2) {
      setError("Please provide at least 2 options")
      return
    }

    setLoading(true)
    setError("")

    try {
      if (mode === "flash") {
        // 5-MIN FLASH POLL CREATION
        const flashPollData = {
          id: `flash_${Date.now()}`,
          conversation_id: conversationId,
          question: cleanQuestion,
          created_at: new Date().toISOString(),
          created_by: currentUserId,
          expires_at: Date.now() + 5 * 60 * 1000,
          options: cleanOptions.map((optText, i) => ({ id: `opt_${i}`, text: optText, votes: [] })),
        }

        localStorage.setItem(`bakaiti_flash_poll_${conversationId}`, JSON.stringify(flashPollData))

        const channel = supabase.channel(`flash-poll-sync:${conversationId}`)
        await channel.subscribe()
        await channel.send({
          type: "broadcast",
          event: "new-flash-poll",
          payload: { poll: flashPollData },
        })
        window.dispatchEvent(new Event(`bakaiti_flash_poll_update_${conversationId}`))

        const messageContent = `⚡ FLASH POLL (5 Mins): ${cleanQuestion}`
        const { data: inserted } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: messageContent,
          })
          .select("*")
          .single()

        if (inserted) {
          window.dispatchEvent(new CustomEvent("bakaiti:new-message", { detail: inserted }))
        }

        sounds.playSentSound()
        onOpenChange(false)
        setQuestion("")
        setOptions(["", ""])
      } else {
        // STANDARD POLL CREATION VIA API
        const res = await fetch("/api/poll/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            question: cleanQuestion,
            options: cleanOptions,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Failed to create poll")
          setLoading(false)
          return
        }

        sounds.playSentSound()
        onOpenChange(false)
        setQuestion("")
        setOptions(["", ""])
      }
    } catch {
      setError("Failed to create poll. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            {mode === "flash" ? <Zap className="h-5 w-5 text-amber-500" /> : <BarChart2 className="h-5 w-5 text-primary" />}
            {mode === "flash" ? "Instant 5-Min Flash Poll" : "Create Interactive Poll"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl">
            <button
              onClick={() => { setMode("standard"); setOptions(["", ""]) }}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "standard" ? "bg-background text-primary shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="h-4 w-4" /> Standard Poll
            </button>
            <button
              onClick={() => { setMode("flash"); setOptions(["Yes 🚀", "No 📚"]) }}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "flash" ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="h-4 w-4" /> 5-Min Flash Poll ⚡
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</label>
            <Input
              placeholder={mode === "flash" ? "e.g. Bunk 9 AM lecture?" : "e.g. Canteen Maggi treat by?"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="font-medium text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options</label>
              {options.length < 6 && (
                <Button size="sm" variant="ghost" onClick={addOption} className="h-7 text-xs text-primary gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Option
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    className="text-xs"
                  />
                  {options.length > 2 && (
                    <Button size="icon" variant="ghost" onClick={() => removeOption(i)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

          <Button className="w-full font-bold gap-2" onClick={handleCreate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "flash" ? <Zap className="h-4 w-4 text-amber-400" /> : <BarChart2 className="h-4 w-4" />}
            {loading ? "Launching Poll..." : mode === "flash" ? "Launch 5-Min Flash Poll ⚡" : "Create & Send Poll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
