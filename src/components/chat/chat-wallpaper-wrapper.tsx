"use client"

import { useState, useEffect } from "react"
import { WALLPAPER_PRESETS, type WallpaperConfig } from "./wallpaper-dialog"

export function ChatWallpaperWrapper({
  conversationId,
  children,
}: {
  conversationId: string
  children: React.ReactNode
}) {
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>({ type: "preset", value: "default" })

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(`bakaiti_wallpaper_${conversationId}`)
        if (saved) {
          setWallpaper(JSON.parse(saved))
        } else {
          setWallpaper({ type: "preset", value: "default" })
        }
      } catch {
        setWallpaper({ type: "preset", value: "default" })
      }
    }
    load()
    const handleUpdate = () => load()
    window.addEventListener(`bakaiti_wallpaper_update_${conversationId}`, handleUpdate)
    return () => window.removeEventListener(`bakaiti_wallpaper_update_${conversationId}`, handleUpdate)
  }, [conversationId])

  const presetClass = wallpaper.type === "preset" ? WALLPAPER_PRESETS.find((p) => p.id === wallpaper.value)?.class ?? "" : ""
  const imageStyle = wallpaper.type === "image" ? { backgroundImage: `url(${wallpaper.value})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined

  return (
    <div className={`relative flex flex-col h-full w-full overflow-hidden transition-all ${presetClass}`} style={imageStyle}>
      {children}
    </div>
  )
}
