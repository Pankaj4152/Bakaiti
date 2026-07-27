"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

interface Sticker {
  id: string
  image_url: string
  pack_id: string
}

interface StickerPack {
  id: string
  name: string
  stickers: Sticker[]
}

export function StickerPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [packs, setPacks] = useState<StickerPack[]>([])
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    fetch("/api/stickers/list")
      .then((r) => r.json())
      .then((data) => setPacks(data.packs ?? []))
  }, [open])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const packName = prompt("Sticker pack name:") || "My Pack"
    const formData = new FormData()
    formData.append("file", file)
    formData.append("packName", packName)
    const res = await fetch("/api/stickers/upload", {
      method: "POST",
      body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      setPacks((prev) => {
        const existing = prev.find((p) => p.id === data.packId)
        if (existing) {
          return prev.map((p) =>
            p.id === data.packId
              ? { ...p, stickers: [...p.stickers, { id: data.stickerId, image_url: data.imageUrl, pack_id: data.packId }] }
              : p
          )
        }
        return [...prev, { id: data.packId, name: packName, stickers: [{ id: data.stickerId, image_url: data.imageUrl, pack_id: data.packId }] }]
      })
    }
    setUploading(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Stickers">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <circle cx="15.5" cy="8.5" r="1.5" />
            <path d="M8 15c0 1.5 1.5 3 4 3s4-1.5 4-3" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Stickers</DialogTitle>
          <label className="cursor-pointer">
            <span className="text-xs text-primary underline">Upload</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {packs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sticker packs yet. Upload one!
            </p>
          )}
          {packs.map((pack) => (
            <div key={pack.id}>
              <h3 className="text-sm font-semibold mb-2">{pack.name}</h3>
              <div className="grid grid-cols-4 gap-2">
                {pack.stickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => {
                      onSelect(sticker.image_url)
                      setOpen(false)
                    }}
                    className="aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  >
                    <img src={sticker.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
