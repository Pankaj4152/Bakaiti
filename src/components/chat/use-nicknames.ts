"use client"

import { useEffect, useState, useCallback } from "react"

// Load all of the current user's nicknames (as a {targetUserId: nickname} map)
// once, and refresh when the NicknameDialog saves a new one.
export function useNicknames() {
  const [nicknames, setNicknames] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/nickname")
      const data = await res.json()
      const map: Record<string, string> = {}
      for (const n of data.nicknames ?? []) {
        if (n?.target_user_id && n.nickname) map[n.target_user_id] = n.nickname
      }
      setNicknames(map)
    } catch {
      setNicknames({})
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener("bakaiti:nickname-updated", handler)
    return () => window.removeEventListener("bakaiti:nickname-updated", handler)
  }, [load])

  return nicknames
}