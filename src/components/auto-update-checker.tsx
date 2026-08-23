"use client"

import { useEffect, useState } from "react"
import { Sparkles, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const CURRENT_VERSION = "1.0.1"

export function AutoUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [newVersion, setNewVersion] = useState<string | null>(null)

  useEffect(() => {
    // Check for app updates every 5 minutes or on app foreground focus
    const checkVersion = async () => {
      try {
        const res = await fetch(`/api/app-version?t=${Date.now()}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (data.version && data.version !== CURRENT_VERSION) {
            setNewVersion(data.version)

            // Silent auto-update for MINOR fixes (default)
            if (data.type !== "major") {
              if ("serviceWorker" in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                for (const reg of registrations) {
                  await reg.update()
                }
              }
              return
            }

            // MAJOR feature updates show the 'Update Now' prompt banner
            setUpdateAvailable(true)
          }
        }
      } catch {}
    }

    checkVersion()
    const interval = setInterval(checkVersion, 5 * 60 * 1000)
    window.addEventListener("focus", checkVersion)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", checkVersion)
    }
  }, [])

  const handleUpdateNow = async () => {
    setUpdating(true)
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.update()
        }
      }
    } catch {}
    window.location.reload()
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm p-3 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-black/90 text-white border border-purple-500/50 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold flex items-center gap-1.5 text-purple-200">
              New Update Ready! {newVersion && <span className="text-[10px] bg-purple-500/30 px-1.5 py-0.2 rounded-full border border-purple-400/30">v{newVersion}</span>}
            </p>
            <p className="text-[11px] text-muted-foreground truncate opacity-85">
              Tap Update to get latest Bakaiti features
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            onClick={handleUpdateNow}
            disabled={updating}
            className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md gap-1.5 px-3 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Updating..." : "Update Now"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setUpdateAvailable(false)}
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
