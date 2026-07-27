self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", (event) => event.waitUntil(clients.claim()))

self.addEventListener("fetch", () => {})

self.addEventListener("push", (event) => {
  let data = { title: "Chitput", body: "New message", url: "/chat" }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      data: { url: data.url },
    })
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
