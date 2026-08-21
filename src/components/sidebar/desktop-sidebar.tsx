"use client"

import { useSyncExternalStore } from "react"
import { UserList } from "./user-list"

const desktopQuery = "(min-width: 768px)"

function subscribe(callback: () => void) {
  const media = window.matchMedia(desktopQuery)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(desktopQuery).matches
}

export function DesktopSidebar() {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, () => false)
  if (!isDesktop) return null

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-r">
      <UserList />
    </aside>
  )
}
