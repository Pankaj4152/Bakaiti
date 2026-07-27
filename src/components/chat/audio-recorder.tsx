"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"

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
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const supabase = createClient()

  useEffect(() => {
    return () => { clearInterval(timer.current) }
  }, [])

  const start = useCallback(async () => {
    chunks.current = []
    setDuration(0)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
    mediaRecorder.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      clearInterval(timer.current)

      const blob = new Blob(chunks.current, { type: "audio/webm" })
      if (blob.size < 100) { onDone(); return }

      setUploading(true)
      const fileName = `${conversationId}/${Date.now()}_${senderId}.webm`

      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(fileName, blob, { contentType: "audio/webm" })

      if (uploadError) { setUploading(false); onDone(); return }

      const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(fileName)

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: null,
        audio_url: publicUrl,
      })

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
