"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const PRESENCE_CHANNEL = "bakaiti:presence"

// Announces the current user as online for as long as this page is open. The
// Realtime presence API takes care of expiring stale entries, so we don't need
// to broadcast a heartbeat.
export function useTrackPresence(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase.channel(PRESENCE_CHANNEL)
    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return
      await channel.track({ user_id: userId })
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}

// Subscribes to the presence channel and returns the set of user ids that are
// currently online. Stale presences are pruned by Supabase automatically.
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: "track-user" } },
    })

    const applyPresence = () => {
      const state = channel.presenceState<{ user_id: string }>()
      const ids = new Set<string>()
      for (const value of Object.values(state)) {
        for (const v of value) {
          if (v.user_id) ids.add(v.user_id)
        }
      }
      setOnlineUsers(ids)
    }

    channel
      .on("presence", { event: "sync" }, applyPresence)
      .on("presence", { event: "join" }, applyPresence)
      .on("presence", { event: "leave" }, applyPresence)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return onlineUsers
}
