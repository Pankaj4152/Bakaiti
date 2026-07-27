"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"

function getSupportedMimeType(): string | undefined {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return undefined
}

export function AudioRecorder({
  conversationId,
  senderId,
  onDone,
}: {
  conversationId: string
  senderId: string
  onDone: () => void
}) {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState("")
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const supabase = createClient()

  useEffect(() => {
    return () => { clearInterval(timer.current) }
  }, [])

  const start = useCallback(async () => {
    setError("")
    chunks.current = []
    setDuration(0)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Recording not supported on this browser")
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError("Microphone access denied")
      return
    }

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      stream.getTracks().forEach((t) => t.stop())
      setError("Audio recording not supported")
      return
    }

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.current = recorder
    const ext = mimeType.includes("mp4") ? "mp4" : "webm"

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      clearInterval(timer.current)

      const blob = new Blob(chunks.current, { type: mimeType })
      if (blob.size < 100) { onDone(); return }

      setUploading(true)
      const fileName = `${conversationId}/${Date.now()}_${senderId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(fileName, blob, { contentType: mimeType })

      if (uploadError) { setError("Upload failed"); setUploading(false); onDone(); return }

      const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(fileName)

      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: null,
        audio_url: publicUrl,
      })

      if (insertError) { setError("Send failed"); setUploading(false); onDone(); return }

      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, senderId, content: "🎤 Audio message" }),
      }).catch(() => {})

      setUploading(false)
      onDone()
    }

    recorder.start(100)
    setRecording(true)
    timer.current = setInterval(() => setDuration((d) => d + 1), 1000)
  }, [conversationId, senderId, onDone])

  const stop = useCallback(() => {
    mediaRecorder.current?.stop()
    setRecording(false)
  }, [])

  if (error) {
    return (
      <div className="relative group">
        <Button size="icon" variant="ghost" className="text-destructive">
          <Mic className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {error}
        </div>
      </div>
    )
  }

  if (uploading) {
    return (
      <Button size="icon" variant="ghost" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (recording) {
    const m = Math.floor(duration / 60)
    const s = duration % 60
    return (
      <Button
        size="icon"
        variant="destructive"
        className="animate-pulse"
        onClick={stop}
        title={`${m}:${s.toString().padStart(2, "0")}`}
      >
        <Square className="h-4 w-4 fill-current" />
      </Button>
    )
  }

  return (
    <Button size="icon" variant="ghost" onClick={start} title="Record audio">
      <Mic className="h-4 w-4" />
    </Button>
  )
}
