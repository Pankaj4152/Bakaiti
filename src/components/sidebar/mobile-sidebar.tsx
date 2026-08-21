"use client"

import { useEffect, useRef } from "react"
import { UserList } from "./user-list"
import { useSidebar } from "./sidebar-context"

export function MobileSidebar() {
  const { open, setOpen } = useSidebar()
  const swipe = useRef<{ startX: number; startY: number; lastX: number; lastY: number } | null>(null)

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return
    const start = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) { swipe.current = null; return }
      if (!open && touch.clientX > Math.max(120, window.innerWidth * 0.35)) {
        swipe.current = null
        return
      }
      swipe.current = { startX: touch.clientX, startY: touch.clientY, lastX: touch.clientX, lastY: touch.clientY }
    }
    const move = (event: TouchEvent) => {
      if (!swipe.current) return
      const touch = event.touches[0]
      if (!touch) return
      swipe.current.lastX = touch.clientX
      swipe.current.lastY = touch.clientY
      const horizontal = touch.clientX - swipe.current.startX
      const vertical = Math.abs(touch.clientY - swipe.current.startY)
      if (Math.abs(horizontal) > 8 && Math.abs(horizontal) > vertical * 1.25 && event.cancelable) {
        event.preventDefault()
      }
    }
    const finish = () => {
      const gesture = swipe.current
      swipe.current = null
      if (!gesture) return
      const horizontal = gesture.lastX - gesture.startX
      const vertical = Math.abs(gesture.lastY - gesture.startY)
      if (!open && horizontal >= 45 && vertical <= 80 && horizontal > vertical * 1.2) {
        setOpen(true)
      } else if (open && horizontal <= -45 && vertical <= 80 && Math.abs(horizontal) > vertical * 1.2) {
        setOpen(false)
      }
    }
    const cancel = () => { swipe.current = null }
    document.addEventListener("touchstart", start, { passive: true, capture: true })
    document.addEventListener("touchmove", move, { passive: false, capture: true })
    document.addEventListener("touchend", finish, { passive: true, capture: true })
    document.addEventListener("touchcancel", cancel, { passive: true, capture: true })
    return () => {
      document.removeEventListener("touchstart", start, true)
      document.removeEventListener("touchmove", move, true)
      document.removeEventListener("touchend", finish, true)
      document.removeEventListener("touchcancel", cancel, true)
    }
  }, [open, setOpen])

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
      <aside role="dialog" aria-modal="true" aria-label="Chat navigation" className="relative h-full w-[min(18rem,86vw)] animate-in slide-in-from-left duration-200 border-r bg-background shadow-2xl">
        <UserList onNav={() => setOpen(false)} />
      </aside>
    </div>
  )
}
