const STATIC_CACHE = "bakaiti-v4-" + Date.now()

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => clients.claim())
  )
})

self.addEventListener("push", (event) => {
  let data = { title: "Chitput", body: "New message", url: "/chat", conversationId: null, tag: null }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

  // Use conversationId as tag so all messages from same chat REPLACE each other (like WhatsApp)
  const tag = data.tag || data.conversationId || "chitput-general"

  event.waitUntil(
    (async () => {
      // If the user already has the app open and visible on this chat, skip the notification
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of allClients) {
        if (client.visibilityState === "visible" && client.url && client.url.includes(data.url)) {
          return // App is open and on this chat — no notification needed
        }
      }

      // Close any existing notification for the same conversation (auto-replace)
      const existing = await self.registration.getNotifications({ tag })
      for (const notif of existing) notif.close()

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        tag,                       // Groups all notifications for same chat into ONE
        renotify: true,            // Still buzz/ping even when replacing (WhatsApp behaviour)
        data: { url: data.url, conversationId: data.conversationId },
      })
    })()
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/chat"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/") && "focus" in client) return client.focus().then(() => client.navigate(url))
      }
      return clients.openWindow(url)
    })
  )
})

// Dismiss notifications when the user opens the chat (called from the app via postMessage)
self.addEventListener("message", (event) => {
  if (event.data?.type === "DISMISS_NOTIFICATIONS" && event.data?.conversationId) {
    const tag = event.data.conversationId
    self.registration.getNotifications({ tag }).then((notifications) => {
      notifications.forEach((n) => n.close())
    })
  }
})
