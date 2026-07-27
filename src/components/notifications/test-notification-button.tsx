"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle2, AlertCircle } from "lucide-react"

export function TestNotificationButton() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    setStatus(null)

    if (!("Notification" in window)) {
      setStatus("error: Desktop notifications are not supported in this browser.")
      setLoading(false)
      return
    }

    let permission = Notification.permission
    if (permission === "default") {
      permission = await Notification.requestPermission()
    }

    if (permission === "denied") {
      setStatus("error: Notifications are BLOCKED by your browser. Click the lock/settings icon near the site URL bar and allow notifications.")
      setLoading(false)
      return
    }

    if (permission === "granted") {
      try {
        let sent = false

        // 1. Try ServiceWorkerRegistration.showNotification (Required for Mobile Android/iOS)
        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready
            if (reg && reg.showNotification) {
              await reg.showNotification("Chitput Test", {
                body: "🚀 Web Push & Service Worker notifications are active on this device!",
                icon: "/android-chrome-192x192.png",
                badge: "/favicon-32x32.png",
              })
              sent = true
            }
          } catch {}
        }

        // 2. Fallback to desktop Notification constructor if Service Worker wasn't ready
        if (!sent) {
          try {
            new Notification("Chitput Test", {
              body: "🎉 Desktop notifications are working on this device!",
              icon: "/android-chrome-192x192.png",
            })
            sent = true
          } catch (e: any) {
            console.warn("Desktop Notification constructor error:", e)
          }
        }

        if (sent) {
          setStatus("success: Notification sent! If you did not see a popup, check device 'Do Not Disturb' or Focus Assist settings.")
        } else {
          setStatus("error: Could not trigger notification on this browser.")
        }
      } catch (err: any) {
        setStatus(`error: Failed to trigger notification: ${err.message}`)
      }
    }
    setLoading(false)
  }

  return (
    <div className="w-full space-y-2 text-left">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2"
      >
        <Bell className="h-4 w-4" />
        {loading ? "Testing..." : "Send Test Notification"}
      </Button>

      {status && (
        <div className={`p-3 text-xs rounded-md border flex items-start gap-2 ${
          status.startsWith("success")
            ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
            : "bg-destructive/10 border-destructive/30 text-destructive"
        }`}>
          {status.startsWith("success") ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{status.replace(/^success: |^error: /, "")}</span>
        </div>
      )}
    </div>
  )
}
