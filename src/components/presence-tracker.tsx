"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTrackPresence } from "@/lib/realtime-presence"

export function PresenceTracker() {
  const [userId, setUserId] = useState<string | null>(null)
  useTrackPresence(userId)

  useEffect(() => {
    const supabase = createClient()
    let interval: ReturnType<typeof setInterval>

    const ping = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) setUserId(user.id)
      if (user?.email) {
        fetch("/api/last-seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        }).catch(() => {})
      }
    }

    ping()
    interval = setInterval(ping, 60000)

    const handleFocus = () => ping()
    window.addEventListener("focus", handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  return null
}
