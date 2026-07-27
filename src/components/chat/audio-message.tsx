"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Loader2 } from "lucide-react"

export function AudioMessage({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => { setDuration(audioRef.current?.duration ?? 0); setLoading(false) }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={toggle} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </Button>
      <div className="flex-1 h-1.5 bg-muted-foreground/20 rounded-full cursor-pointer relative" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const pct = (e.clientX - rect.left) / rect.width
        if (audioRef.current) {
          audioRef.current.currentTime = pct * duration
          setCurrent(pct * duration)
        }
      }}>
        <div className="h-full bg-primary rounded-full" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{loading ? "--" : fmt(current)}</span>
    </div>
  )
}
