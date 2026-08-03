"use client"

import { useEffect, useState, useCallback } from "react"

// Load the current user's nickname for a target user and keep it in sync when
// the NicknameDialog saves a new one (via the bakaiti:nickname-updated event).
export function useNickname(targetUserId?: string) {
  const [nickname, setNickname] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!targetUserId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/nickname?targetUserId=${targetUserId}`)
      const data = await res.json()
      setNickname(data.nickname?.nickname ?? null)
    } catch {
      setNickname(null)
    } finally {
      setLoading(false)
    }
  }, [targetUserId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetUserId?: string }
      if (detail?.targetUserId === targetUserId) load()
    }
    window.addEventListener("bakaiti:nickname-updated", handler)
    return () => window.removeEventListener("bakaiti:nickname-updated", handler)
  }, [targetUserId, load])

  return { nickname, loading, reload: load }
}