"use client"

import { useEffect, useState } from "react"
import { WifiOff, Wifi } from "lucide-react"

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOnlineBanner, setShowOnlineBanner] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowOnlineBanner(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOnlineBanner(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline && showOnlineBanner) {
      const timer = setTimeout(() => {
        setShowOnlineBanner(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, showOnlineBanner])

  if (isOnline && !showOnlineBanner) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
      {!isOnline ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg border border-red-500/20 animate-bounce">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Connection lost. Reconnecting...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg border border-emerald-500/20">
          <Wifi className="h-3.5 w-3.5" />
          <span>Back online</span>
        </div>
      )}
    </div>
  )
}
