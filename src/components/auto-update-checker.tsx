"use client"

import { useEffect } from "react"

const CURRENT_VERSION = "1.0.1"

export function AutoUpdateChecker() {
  useEffect(() => {
    // Check for app updates every 5 minutes or on app foreground focus
    const checkVersion = async () => {
      try {
        const res = await fetch(`/api/app-version?t=${Date.now()}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (data.version && data.version !== CURRENT_VERSION) {
            // New update available on Vercel live server -> automatically reload app cache
            if ("serviceWorker" in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations()
              for (const reg of registrations) {
                await reg.update()
              }
            }
            window.location.reload()
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

  return null
}
