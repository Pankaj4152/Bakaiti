"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface Reminder {
  id: string
  text: string
  remind_at: string
  created_by_name: string
}

export function ReminderChecker() {
  const [toasts, setToasts] = useState<Reminder[]>([])
  const processedIds = useRef<Set<string>>(new Set())

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/remind/check")
      const data = await res.json()
      if (data.reminders?.length > 0) {
        const newReminders = data.reminders.filter(
          (r: Reminder) => !processedIds.current.has(r.id)
        )
        if (newReminders.length > 0) {
          newReminders.forEach((r: Reminder) => processedIds.current.add(r.id))
          setToasts((prev) => [...prev, ...newReminders])

          newReminders.forEach((r: Reminder) => {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("⏰ Reminder", {
                body: r.text,
                tag: r.id,
              })
            }
          })

          setTimeout(() => {
            setToasts((prev) =>
              prev.filter((t) => !newReminders.find((r: Reminder) => r.id === t.id))
            )
          }, 5000)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [check])

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-popover border border-border rounded-lg shadow-lg p-3 animate-in slide-in-from-right fade-in"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">⏰ Reminder from {toast.created_by_name}</p>
              <p className="text-sm font-medium mt-0.5">{toast.text}</p>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-muted-foreground hover:text-foreground text-sm leading-none shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
