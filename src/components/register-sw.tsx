"use client"

import { useEffect } from "react"

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.update()
        }
      })
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            if (key !== "bakaiti-static-v3") {
              caches.delete(key)
            }
          }
        })
      }
    }
  }, [])
  return null
}
