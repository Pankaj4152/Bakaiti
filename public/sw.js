const STATIC_CACHE = "bakaiti-static-v2"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/favicon-32x32.png", "/android-chrome-192x192.png"])).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))).then(() => clients.claim()))
})

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request)
      } catch {
        await wait(650)
        try {
          return await fetch(request)
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error()
        }
      }
    })())
    return
  }

  const url = new URL(request.url)
  if (url.origin === self.location.origin && ["image", "font", "style"].includes(request.destination)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const responseToCache = response.clone()
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseToCache)).catch(() => {})
      }
      return response
    })))
  }
})

self.addEventListener("push", (event) => {
  let data = { title: "Chitput", body: "New message", url: "/chat" }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    data: { url: data.url },
  }))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/chat"
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if (client.url.includes("/") && "focus" in client) return client.focus().then(() => client.navigate(url))
    }
    return clients.openWindow(url)
  }))
})
