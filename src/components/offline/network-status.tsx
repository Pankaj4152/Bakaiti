"use client"

import { useEffect, useState } from "react"
import { WifiOff, RefreshCw } from "lucide-react"

export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true)
    }

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-semibold shadow-lg backdrop-blur-md animate-in slide-in-from-top-2 border border-red-400/40">
      <WifiOff className="h-3.5 w-3.5 animate-pulse" />
      <span>No Internet Connection • Retrying...</span>
    </div>
  )
}
