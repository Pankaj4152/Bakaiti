"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  onClose,
}: {
  images: string[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const initialDistance = useRef<number | null>(null)
  const currentUrl = images[initialIndex] ?? ""
  const isVideo = currentUrl.match(/\.(mp4|webm|mov|avi)$/i)

  useEffect(() => {
    setZoom(1)
  }, [open, currentUrl])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  // Native pinch to zoom handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      initialDistance.current = dist
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / initialDistance.current
      setZoom((prev) => Math.min(Math.max(prev * factor, 1), 4))
      initialDistance.current = dist
    }
  }

  const handleTouchEnd = () => {
    initialDistance.current = null
  }

  // Wheel zoom for touchpad & mouse
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.15 : -0.15
      setZoom((prev) => Math.min(Math.max(prev + delta, 1), 4))
    }
  }

  if (!open || !currentUrl) return null

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-0 select-none animate-in fade-in duration-150"
      onClick={onClose}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sleek Floating Close Button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 z-50 h-10 w-10 text-white bg-black/40 hover:bg-white/20 rounded-full backdrop-blur-md"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        title="Close (Esc)"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Main Fullscreen Media */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={currentUrl}
            controls
            autoPlay
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <img
            src={currentUrl}
            alt="Media"
            className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
            style={{ transform: `scale(${zoom})` }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setZoom((prev) => (prev > 1 ? 1 : 2))
            }}
          />
        )}
      </div>
    </div>
  )
}
