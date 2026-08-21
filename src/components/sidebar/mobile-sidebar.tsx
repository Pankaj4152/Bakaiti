"use client"

import { useEffect, useRef } from "react"
import { UserList } from "./user-list"
import { useSidebar } from "./sidebar-context"

export function MobileSidebar() {
  const { open, setOpen } = useSidebar()
  const swipe = useRef<{ startX: number; startY: number; lastX: number; lastY: number } | null>(null)

  const startEdgeSwipe = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    swipe.current = { startX: touch.clientX, startY: touch.clientY, lastX: touch.clientX, lastY: touch.clientY }
  }

  const trackEdgeSwipe = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!swipe.current) return
    const touch = event.touches[0]
    swipe.current.lastX = touch.clientX
    swipe.current.lastY = touch.clientY
    const horizontal = touch.clientX - swipe.current.startX
    const vertical = Math.abs(touch.clientY - swipe.current.startY)
    if (horizontal > 8 && horizontal > vertical * 1.5 && event.cancelable) event.preventDefault()
  }

  const finishEdgeSwipe = () => {
    const gesture = swipe.current
    swipe.current = null
    if (!gesture) return
    const horizontal = gesture.lastX - gesture.startX
    const vertical = Math.abs(gesture.lastY - gesture.startY)
    if (horizontal >= 60 && vertical <= 45 && horizontal > vertical * 1.5) setOpen(true)
  }

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

  if (!open) {
    return (
      <div
        className="fixed inset-y-0 left-0 z-40 w-6 touch-pan-y md:hidden"
        onTouchStart={startEdgeSwipe}
        onTouchMove={trackEdgeSwipe}
        onTouchEnd={finishEdgeSwipe}
        onTouchCancel={() => { swipe.current = null }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close chat navigation" />
      <aside role="dialog" aria-modal="true" aria-label="Chat navigation" className="relative h-full w-[min(18rem,86vw)] animate-in slide-in-from-left duration-200 border-r bg-background shadow-2xl">
        <UserList onNav={() => setOpen(false)} />
      </aside>
    </div>
  )
}
