"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buf
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return

    const init = async () => {
      const reg = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      if (Notification.permission === "default") {
        const result = await Notification.requestPermission()
        if (result !== "granted") return
      }
      if (Notification.permission !== "granted") return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const publicKeyRes = await fetch("/api/push/subscribe")
      const { publicKey } = await publicKeyRes.json()
      if (!publicKey) return

      const existing = await reg.pushManager.getSubscription()
      if (existing) return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      })

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })
    }

    init().catch(() => {})
  }, [])

  return <>{children}</>
}
