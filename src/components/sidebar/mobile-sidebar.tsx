"use client"

import { useEffect } from "react"
import { UserList } from "./user-list"
import { useSidebar } from "./sidebar-context"

export function MobileSidebar() {
  const { open, setOpen } = useSidebar()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close chat navigation" />
      <aside role="dialog" aria-modal="true" aria-label="Chat navigation" className="relative h-full w-[min(18rem,86vw)] border-r bg-background shadow-2xl">
        <UserList onNav={() => setOpen(false)} />
      </aside>
    </div>
  )
}
