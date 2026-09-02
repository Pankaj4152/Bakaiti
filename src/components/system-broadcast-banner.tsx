"use client"

import { useState, useEffect } from "react"
import { Megaphone, X } from "lucide-react"

interface Broadcast {
  id: string
  title: string
  message: string
  created_at: string
}

export function SystemBroadcastBanner() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch("/api/broadcast/latest")
      .then((res) => res.json())
      .then((data) => {
        if (data.broadcast) {
          const dismissedId = localStorage.getItem("bakaiti_dismissed_broadcast")
          if (dismissedId !== data.broadcast.id) {
            setBroadcast(data.broadcast)
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleDismiss = () => {
    if (broadcast) {
      localStorage.setItem("bakaiti_dismissed_broadcast", broadcast.id)
    }
    setDismissed(true)
  }

  if (!broadcast || dismissed) return null

  return (
    <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white px-4 py-2.5 flex items-center justify-between text-xs shadow-md border-b border-purple-400/30 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 truncate">
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <Megaphone className="w-3.5 h-3.5 text-white animate-bounce" />
        </div>
        <div className="truncate">
          <span className="font-extrabold uppercase tracking-wide mr-2 text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
            {broadcast.title}
          </span>
          <span className="font-medium text-purple-100">{broadcast.message}</span>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0 ml-3 text-purple-100 hover:text-white"
        title="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
