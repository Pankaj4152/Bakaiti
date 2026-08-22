"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart2, Plus, Trash2, Loader2, Sparkles } from "lucide-react"
import { sounds } from "@/lib/sounds"

export function CreatePollDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
            <BarChart2 className="h-5 w-5 text-primary" /> Create Interactive Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poll Question</label>
            <Input
              placeholder="e.g. Canteen Maggi treat by?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="font-medium text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Poll Options</label>
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
            {loading ? "Creating Poll..." : "Create & Send Poll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
