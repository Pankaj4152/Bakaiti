"use client"

import { useEffect, useRef } from "react"
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
  const names = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!("Notification" in window)) return

    if (Notification.permission === "default") {
      Notification.requestPermission()
    }

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: profile } = await supabase
        .from("allowed_users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle()
      if (!profile) return

      // Try Push API (works even when app is closed)
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js")
          await navigator.serviceWorker.ready

          if (Notification.permission === "granted") {
            const pkRes = await fetch("/api/push/subscribe")
            const { publicKey } = await pkRes.json()
            if (publicKey) {
              const existing = await reg.pushManager.getSubscription()
              if (!existing) {
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToArrayBuffer(publicKey),
                })
                await fetch("/api/push/subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(sub.toJSON()),
                }).catch(() => {})
              }
            }
          }
        } catch {} // Push API failed, fallback below
      }

      // Fallback: browser notifications via Realtime (works when page is open)
      if (Notification.permission !== "granted") return

      const channel = supabase
        .channel("notifications-fallback")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const msg = payload.new as any
            if (msg.sender_id === profile.id) return
            if (document.visibilityState === "visible") return
            if (Notification.permission !== "granted") return

            let name = names.current[msg.sender_id]
            if (!name) {
              const { data: sender } = await supabase
                .from("allowed_users")
                .select("name")
                .eq("id", msg.sender_id)
                .maybeSingle()
              name = sender?.name ?? "Someone"
              names.current[msg.sender_id] = name
            }

            const notif = new Notification(name, {
              body: msg.content || "🎤 Voice message",
            })
            notif.onclick = () => {
              window.focus()
              supabase
                .from("conversations")
                .select("user1_id, user2_id")
                .eq("id", msg.conversation_id)
                .maybeSingle()
                .then(({ data: convo }) => {
                  if (convo) {
                    const otherId = convo.user1_id === profile.id ? convo.user2_id : convo.user1_id
                    window.location.href = `/chat/${otherId}`
                  }
                })
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    setup()
  }, [])

  return <>{children}</>
}
