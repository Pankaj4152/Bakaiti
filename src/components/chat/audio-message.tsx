"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Loader2, Mic } from "lucide-react"

export function AudioMessage({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Attempt pre-fetching duration if metadata doesn't fire immediately
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration)
        setLoading(false)
      }
    }
  }, [url])

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (audioRef.current && duration) {
      const seekTime = pct * duration
      audioRef.current.currentTime = seekTime
      setCurrent(seekTime)
    }
  }

  const fmt = (s: number) => {
    if (isNaN(s) || s === Infinity || s <= 0) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const progressPct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 min-w-[230px] max-w-[280px] py-1.5 px-2 rounded-2xl bg-black/15 dark:bg-white/10 border border-white/10 backdrop-blur-md shadow-sm">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current?.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== Infinity) {
            setDuration(audioRef.current.duration)
          }
          setLoading(false)
        }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onEnded={() => {
          setPlaying(false)
          setCurrent(0)
        }}
      />

      <Button
        size="icon"
        variant="ghost"
        className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all hover:scale-105 active:scale-95"
        onClick={toggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : playing ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 fill-current ml-0.5" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Animated Waveform Visualizer & Seek Track */}
        <div
          className="relative h-6 flex items-center gap-[3px] cursor-pointer group py-1"
          onClick={handleSeek}
          title="Click to seek"
        >
          {/* Audio Bars simulation */}
          {Array.from({ length: 24 }).map((_, i) => {
            // Simulated heights for audio waveform
            const barHeight = [35, 60, 40, 85, 50, 100, 75, 45, 90, 65, 30, 80, 95, 55, 70, 40, 85, 60, 35, 75, 90, 50, 65, 40][i % 24]
            const barPct = (i / 24) * 100
            const isPlayed = barPct <= progressPct

            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPlayed ? "bg-primary shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-muted-foreground/30"
                } ${
                  playing
                    ? "animate-pulse"
                    : "group-hover:opacity-100"
                }`}
                style={{
                  height: `${barHeight}%`,
                  animationDelay: `${(i % 5) * 120}ms`,
                  animationDuration: playing ? "0.8s" : "0s",
                }}
              />
            )
          })}
        </div>

        {/* Timing and Live Visualizer Equalizer indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono font-medium opacity-90 px-0.5">
          <span className="text-primary font-bold">{playing ? fmt(current) : fmt(duration)}</span>

          {playing && (
            <div className="flex items-center gap-0.5 h-3">
              <span className="w-0.5 h-full bg-primary animate-bounce rounded-full" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
              <span className="w-0.5 h-full bg-primary animate-bounce rounded-full" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
              <span className="w-0.5 h-full bg-primary animate-bounce rounded-full" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
              <span className="w-0.5 h-full bg-primary animate-bounce rounded-full" style={{ animationDelay: "450ms", animationDuration: "0.6s" }} />
            </div>
          )}

          <span className="text-muted-foreground flex items-center gap-1">
            <Mic className="h-3 w-3 opacity-60" />
            {fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
