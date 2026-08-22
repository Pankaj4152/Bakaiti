"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Palette, Check, Image as ImageIcon } from "lucide-react"

export interface WallpaperConfig {
  type: "preset" | "image"
  value: string
}

export const WALLPAPER_PRESETS = [
  { id: "default", name: "Default Dark", class: "bg-background" },
  { id: "gradient-midnight", name: "Midnight Purple", class: "bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-950" },
  { id: "gradient-emerald", name: "Emerald Forest", class: "bg-gradient-to-br from-zinc-950 via-emerald-950/80 to-slate-950" },
  { id: "gradient-synthwave", name: "Neon Synthwave", class: "bg-gradient-to-br from-slate-950 via-fuchsia-950/70 to-cyan-950/80" },
  { id: "gradient-sunset", name: "Deep Sunset", class: "bg-gradient-to-br from-slate-950 via-rose-950/70 to-amber-950/60" },
  { id: "pattern-grid", name: "Subtle Grid", class: "bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950" },
]

export function WallpaperDialog({
  conversationId,
  onWallpaperChange,
}: {
  conversationId: string
  onWallpaperChange: (config: WallpaperConfig) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>("default")
  const [customUrl, setCustomUrl] = useState("")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bakaiti_wallpaper_${conversationId}`)
      if (saved) {
        const parsed: WallpaperConfig = JSON.parse(saved)
        if (parsed.type === "preset") setSelected(parsed.value)
        else if (parsed.type === "image") {
          setSelected("custom")
          setCustomUrl(parsed.value)
        }
      }
    } catch {}
  }, [conversationId])

  const applyPreset = (presetId: string) => {
    setSelected(presetId)
    const config: WallpaperConfig = { type: "preset", value: presetId }
    try {
      localStorage.setItem(`bakaiti_wallpaper_${conversationId}`, JSON.stringify(config))
    } catch {}
    window.dispatchEvent(new Event(`bakaiti_wallpaper_update_${conversationId}`))
    onWallpaperChange?.(config)
  }

  const applyCustomUrl = () => {
    if (!customUrl.trim()) return
    setSelected("custom")
    const config: WallpaperConfig = { type: "image", value: customUrl.trim() }
    try {
      localStorage.setItem(`bakaiti_wallpaper_${conversationId}`, JSON.stringify(config))
    } catch {}
    window.dispatchEvent(new Event(`bakaiti_wallpaper_update_${conversationId}`))
    onWallpaperChange?.(config)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        setCustomUrl(result)
        setSelected("custom")
        const config: WallpaperConfig = { type: "image", value: result }
        try {
          localStorage.setItem(`bakaiti_wallpaper_${conversationId}`, JSON.stringify(config))
        } catch {}
        window.dispatchEvent(new Event(`bakaiti_wallpaper_update_${conversationId}`))
        onWallpaperChange?.(config)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Chat Wallpaper">
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Chat Wallpaper
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2.5">
            {WALLPAPER_PRESETS.map((p) => {
              const isSelected = selected === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`h-20 rounded-xl border-2 relative overflow-hidden transition-all flex flex-col justify-end p-2 ${p.class} ${
                    isSelected ? "border-primary ring-2 ring-primary/40 scale-105" : "border-border/60 hover:border-border"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-white/90 drop-shadow">{p.name}</span>
                </button>
              )
            })}
          </div>

          <div className="pt-3 border-t space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Image Wallpaper</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/wallpaper.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={applyCustomUrl} disabled={!customUrl.trim()}>
                Apply
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline">
                <ImageIcon className="h-4 w-4" /> Upload Custom Image
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
