"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AudioMessage } from "./audio-message"
import { ImageMessage } from "./image-message"

type Tab = "media" | "audio" | "links"

export function SharedMediaDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState<Tab>("media")
  const [images, setImages] = useState<string[]>([])
  const [audioFiles, setAudioFiles] = useState<{ url: string; created_at: string }[]>([])
  const [links, setLinks] = useState<{ url: string; text: string }[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setLoading(true)

    const load = async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("content, image_url, audio_url")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })

      if (!msgs) { setLoading(false); return }

      const imgs: string[] = []
      const audios: { url: string; created_at: string }[] = []
      const lnks: { url: string; text: string }[] = []

      for (const m of msgs) {
        if (m.image_url) imgs.push(m.image_url)
        if (m.audio_url) audios.push({ url: m.audio_url, created_at: "" })
        if (m.content) {
          const urlRegex = /(https?:\/\/[^\s]+)/g
          const found = m.content.match(urlRegex)
          if (found) for (const u of found) {
            lnks.push({ url: u, text: u.length > 40 ? u.slice(0, 40) + "..." : u })
          }
        }
      }

      setImages(imgs)
      setAudioFiles(audios)
      setLinks(lnks)
      setLoading(false)
    }

    load()
  }, [open, conversationId])

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "media", label: "Media", count: images.length },
    { key: "audio", label: "Audio", count: audioFiles.length },
    { key: "links", label: "Links", count: links.length },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Shared Media</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 border-b pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                tab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {t.label} {t.count > 0 && `(${t.count})`}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : tab === "media" && images.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No media shared yet</p>
          ) : tab === "media" ? (
            <div className="grid grid-cols-3 gap-2 p-1">
              {images.map((url, i) => (
                <ImageMessage key={i} url={url} />
              ))}
            </div>
          ) : tab === "audio" && audioFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No audio messages yet</p>
          ) : tab === "audio" ? (
            <div className="space-y-2 p-1">
              {audioFiles.map((a, i) => (
                <AudioMessage key={i} url={a.url} />
              ))}
            </div>
          ) : tab === "links" && links.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No links shared yet</p>
          ) : (
            <div className="space-y-1 p-1">
              {links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-primary hover:underline truncate p-2 rounded hover:bg-accent"
                >
                  {l.text}
                </a>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
