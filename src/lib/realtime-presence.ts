"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { RealtimeChannel } from "@supabase/supabase-js"

const PRESENCE_CHANNEL = "bakaiti:presence"

// Keep track of active listeners and current state globally in this module
let globalChannel: RealtimeChannel | null = null
let trackUserId: string | null = null
const onlineUsersListeners = new Set<(users: Set<string>) => void>()
let currentOnlineUsers = new Set<string>()

function updateOnlineUsers(channel: RealtimeChannel) {
  const state = channel.presenceState<{ user_id: string }>()
  const ids = new Set<string>()
  for (const value of Object.values(state)) {
    for (const v of value) {
      if (v.user_id) ids.add(v.user_id)
    }
  }
  currentOnlineUsers = ids
  onlineUsersListeners.forEach((listener) => listener(ids))
}

function getOrCreateChannel() {
  if (globalChannel) return globalChannel

  const supabase = createClient()
  const channel = supabase.channel(PRESENCE_CHANNEL, {
    config: { presence: { key: "track-user" } },
  })

  channel
    .on("presence", { event: "sync" }, () => updateOnlineUsers(channel))
    .on("presence", { event: "join" }, () => updateOnlineUsers(channel))
    .on("presence", { event: "leave" }, () => updateOnlineUsers(channel))

  channel.subscribe(async (status) => {
    if (status !== "SUBSCRIBED") return
    if (trackUserId) {
      await channel.track({ user_id: trackUserId }).catch(() => {})
    }
  })

  globalChannel = channel
  return channel
}

function destroyChannel() {
  if (!globalChannel) return
  const supabase = createClient()
  supabase.removeChannel(globalChannel)
  globalChannel = null
  currentOnlineUsers = new Set()
}

// Announces the current user as online for as long as this page is open.
export function useTrackPresence(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return
    trackUserId = userId
    const channel = getOrCreateChannel()

    // If channel is already subscribed, track immediately
    if (channel.state === "joined") {
      channel.track({ user_id: userId }).catch(() => {})
    }

    return () => {
      trackUserId = null
      if (globalChannel) {
        globalChannel.untrack().catch(() => {})
      }
      if (onlineUsersListeners.size === 0 && !trackUserId) {
        destroyChannel()
      }
    }
  }, [userId])
}

// Subscribes to the presence channel and returns the set of user ids that are
// currently online. Stale presences are pruned by Supabase automatically.
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(currentOnlineUsers)

  useEffect(() => {
    const channel = getOrCreateChannel()
    
    const listener = (users: Set<string>) => {
      setOnlineUsers(new Set(users))
    }
    onlineUsersListeners.add(listener)
    listener(currentOnlineUsers)

    return () => {
      onlineUsersListeners.delete(listener)
      if (onlineUsersListeners.size === 0 && !trackUserId) {
        destroyChannel()
      }
    }
  }, [])

  return onlineUsers
}

