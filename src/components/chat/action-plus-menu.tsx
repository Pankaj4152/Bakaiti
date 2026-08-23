"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Image, BarChart2, Zap, Trophy, X } from "lucide-react"

export function ActionPlusMenu({
  onSelectImage,
  onSelectPoll,
  onSelectFlashPoll,
  onSelectNicknameBattle,
}: {
  onSelectImage: () => void
  onSelectPoll: () => void
  onSelectFlashPoll: () => void
  onSelectNicknameBattle: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setOpen(!open)}
        className={`h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-transform ${
          open ? "rotate-45 text-primary bg-primary/10" : ""
        }`}
        title="More Features"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-56 p-1.5 bg-popover/95 backdrop-blur-md border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 space-y-1">
          <button
            onClick={() => { setOpen(false); onSelectImage() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-accent transition-colors text-left"
          >
            <Image className="h-4 w-4 text-emerald-500" />
            <span>Upload Image / Media</span>
          </button>

          <button
            onClick={() => { setOpen(false); onSelectPoll() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-accent transition-colors text-left"
          >
            <BarChart2 className="h-4 w-4 text-blue-500" />
            <span>Create Standard Poll</span>
          </button>

          <button
            onClick={() => { setOpen(false); onSelectFlashPoll() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-accent transition-colors text-left"
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <span>5-Min Flash Poll</span>
          </button>

          <button
            onClick={() => { setOpen(false); onSelectNicknameBattle() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg hover:bg-accent transition-colors text-left"
          >
            <Trophy className="h-4 w-4 text-purple-500" />
            <span>Group Nickname Battle</span>
          </button>
        </div>
      )}
    </div>
  )
}
