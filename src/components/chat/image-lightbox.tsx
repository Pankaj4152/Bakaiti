"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight } from "lucide-react"
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
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setIndex(initialIndex)
    setZoom(1)
  }, [initialIndex, open])

  const currentUrl = images[index] ?? ""
  const isVideo = currentUrl.match(/\.(mp4|webm|mov|avi)$/i)

  const handleNext = useCallback(() => {
    if (images.length === 0) return
    setIndex((prev) => (prev + 1) % images.length)
    setZoom(1)
  }, [images.length])

  const handlePrev = useCallback(() => {
    if (images.length === 0) return
    setIndex((prev) => (prev - 1 + images.length) % images.length)
    setZoom(1)
  }, [images.length])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") handleNext()
      else if (e.key === "ArrowLeft") handlePrev()
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 3))
      else if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5))
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose, handleNext, handlePrev])

  const handleDownload = async () => {
    if (!currentUrl) return
    setDownloading(true)
    try {
      const res = await fetch(currentUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      const ext = isVideo ? "mp4" : "jpg"
      a.download = `bakaiti_media_${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(currentUrl, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diffX = e.changedTouches[0].clientX - touchStartX.current
    if (diffX > 50) handlePrev()
    else if (diffX < -50) handleNext()
    touchStartX.current = null
  }

  if (!open || !currentUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Toolbar */}
      <div className="flex items-center justify-between text-white z-10">
        <div className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          {images.length > 1 ? `${index + 1} / ${images.length}` : "Media View"}
        </div>
        <div className="flex items-center gap-1.5">
          {!isVideo && (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoom(1)} title="Reset Zoom">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={handleDownload} disabled={downloading} title="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Image Display Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
        {images.length > 1 && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-2 z-10 h-10 w-10 text-white bg-black/40 hover:bg-black/70 rounded-full"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 z-10 h-10 w-10 text-white bg-black/40 hover:bg-black/70 rounded-full"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {isVideo ? (
          <video src={currentUrl} controls autoPlay className="max-w-full max-h-full rounded-lg" />
        ) : (
          <img
            src={currentUrl}
            alt="Shared content"
            className="max-w-full max-h-full object-contain transition-transform duration-150 ease-out rounded-sm"
            style={{ transform: `scale(${zoom})` }}
          />
        )}
      </div>

      <div className="text-center text-[11px] text-white/60">
        Press ESC or tap X to close • Use ← → to navigate • Scroll / pinch to zoom
      </div>
    </div>
  )
}
