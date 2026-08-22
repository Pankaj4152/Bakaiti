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
    if (isNaN(s) || s === Infinity) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-0.5">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => { setDuration(audioRef.current?.duration ?? 0); setLoading(false) }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onEnded={() => { setPlaying(false); setCurrent(0) }}
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 rounded-full bg-background/20 hover:bg-background/30 transition-colors"
        onClick={toggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-2 bg-black/20 dark:bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            if (audioRef.current && duration) {
              audioRef.current.currentTime = pct * duration
              setCurrent(pct * duration)
            }
          }}
        >
          <div
            className="h-full bg-current rounded-full transition-all duration-100 opacity-90"
            style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
          <span>{fmt(current)}</span>
          {playing && (
            <span className="flex items-center gap-0.5 h-2">
              <span className="w-0.5 h-full bg-current animate-bounce rounded-full" style={{ animationDelay: "0ms" }} />
              <span className="w-0.5 h-full bg-current animate-bounce rounded-full" style={{ animationDelay: "150ms" }} />
              <span className="w-0.5 h-full bg-current animate-bounce rounded-full" style={{ animationDelay: "300ms" }} />
            </span>
          )}
          <span>{loading ? "--:--" : fmt(duration)}</span>
        </div>
      </div>
    </div>
  )
}
