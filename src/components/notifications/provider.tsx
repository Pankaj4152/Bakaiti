"use client"

import { useEffect, useRef, useState } from "react"
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
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userEmail) return
    if (!("Notification" in window)) return

    let isSubscribed = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const initNotifications = async () => {
      let permission = Notification.permission
      if (permission === "default") {
        permission = await Notification.requestPermission()
      }

      if (permission !== "granted") return

      const { data: profile } = await supabase
        .from("allowed_users")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle()

      if (!profile || !isSubscribed) return

      // Web Push API (works when app is closed / in background)
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js")
          await navigator.serviceWorker.ready

          const pkRes = await fetch("/api/push/subscribe")
          const { publicKey } = await pkRes.json()

          if (publicKey) {
            let sub = await reg.pushManager.getSubscription()
            if (!sub) {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToArrayBuffer(publicKey),
              })
            }
            if (sub) {
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...sub.toJSON(), userId: profile.id }),
              }).catch(() => {})
            }
          }
        } catch (err) {
          console.error("Push notification registration failed:", err)
        }
      }

      // Fallback browser notifications via Realtime (for open background tabs)
      channel = supabase
        .channel(`notifications-fallback-${profile.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const msg = payload.new as any
            if (msg.sender_id === profile.id) return
            if (document.visibilityState === "visible") return

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

            const notifOptions = {
              body: msg.content || "🎤 Voice message",
              icon: "/android-chrome-192x192.png",
              badge: "/favicon-32x32.png",
              data: { url: `/chat/${msg.sender_id}` },
            }

            if ("serviceWorker" in navigator) {
              try {
                const reg = await navigator.serviceWorker.ready
                if (reg && reg.showNotification) {
                  await reg.showNotification(name, notifOptions)
                  return
                }
              } catch {}
            }

            try {
              const notif = new Notification(name, notifOptions)
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
            } catch (e) {
              console.warn("Desktop notification fallback ignored:", e)
            }
          }
        )
        .subscribe()
    }

    initNotifications()

    return () => {
      isSubscribed = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [userEmail])

  return <>{children}</>
}

