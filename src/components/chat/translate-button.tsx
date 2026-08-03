"use client"

import { useState } from "react"
import { Languages } from "lucide-react"
import { cn } from "@/lib/utils"

const LANGUAGES = [
  "English", "Hindi", "Spanish", "French", "German", "Japanese", "Korean",
  "Chinese", "Arabic", "Portuguese", "Russian", "Tamil", "Telugu", "Bengali",
]

export function TranslateButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState<string | null>(null)

  const translate = async (language: string) => {
    setOpen(false)
    setTranslating(true)
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      })
      const data = await res.json()
      setTranslation(data?.translated ?? null)
    } catch {
      setTranslation(null)
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Translate message"
        aria-label="Translate message"
      >
        <Languages className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-30 w-40 bg-popover border rounded-md shadow-lg p-1 text-left">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => translate(lang)}
              className="block w-full text-xs px-2 py-1 text-left rounded hover:bg-accent transition-colors"
            >
              {lang}
            </button>
          ))}
        </div>
      )}
      {translating && (
        <span className="ml-1 text-[10px] text-muted-foreground">translating…</span>
      )}
      {translation && !open && !translating && (
        <div className={cn("mt-1 px-3 py-1.5 text-xs border border-dashed rounded-lg bg-background/40 text-muted-foreground")}>
          {translation}
        </div>
      )}
    </div>
  )
}
