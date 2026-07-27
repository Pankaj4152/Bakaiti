"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const names = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!("Notification" in window)) return
    if (Notification.permission === "default") Notification.requestPermission()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return

      supabase
        .from("allowed_users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (!profile) return

          const channel = supabase
            .channel("global-messages")
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
                  body: msg.content,
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
        })
    })
  }, [])

  return <>{children}</>
}
