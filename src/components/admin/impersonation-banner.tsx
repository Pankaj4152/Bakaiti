"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, LogOut, RefreshCw } from "lucide-react"

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState(false)
  const [targetUser, setTargetUser] = useState<{ id: string; name: string; username: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/admin/impersonate")
      .then((res) => res.json())
      .then((data) => {
        if (data.impersonating && data.targetUser) {
          setImpersonating(true)
          setTargetUser(data.targetUser)
        }
      })
      .catch(() => {})
  }, [])

  const stopImpersonating = async () => {
    setLoading(true)
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" })
      setImpersonating(false)
      window.location.href = "/"
    } catch {
      setLoading(false)
    }
  }

  if (!impersonating || !targetUser) return null

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-xs font-bold shadow-lg border-b border-amber-600">
      <div className="flex items-center gap-2 truncate">
        <Eye className="w-4 h-4 text-amber-950 shrink-0 animate-pulse" />
        <span className="truncate">
          IMPERSONATION MODE: Viewing app as <span className="underline">{targetUser.name}</span> (@{targetUser.username})
        </span>
      </div>

      <button
        onClick={stopImpersonating}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950 hover:bg-black text-amber-100 transition-colors shrink-0 shadow-sm disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
        <span>Exit Impersonation</span>
      </button>
    </div>
  )
}
