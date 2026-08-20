"use client"

import { useEffect } from "react"

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => registration.update()).catch(() => {})
    }
  }, [])
  return null
}
