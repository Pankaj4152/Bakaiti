"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Mic, Square, Loader2 } from "lucide-react"

function getSupportedMimeType(): string | undefined {
  const types = [
    "audio/webm;codecs=opus", "audio/webm",
    "audio/ogg;codecs=opus", "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4", "audio/aac", "audio/3gpp",
  ]
  for (const t of types) {
    try { if (MediaRecorder.isTypeSupported(t)) return t } catch {}
  }
  return undefined
}

export function AudioRecorder({
  conversationId, senderId, onDone,
}: {
  conversationId: string; senderId: string; onDone: () => void
}) {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState("")
  const [permState, setPermState] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown")
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const supabase = createClient()

  useEffect(() => {
    return () => { clearInterval(timer.current) }
  }, [])

  // Check permission state on mount
  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((s) => {
        setPermState(s.state as any)
        s.onchange = () => setPermState(s.state as any)
      }).catch(() => {})
    }
  }, [])

  const startRecording = useCallback(async () => {
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
    } catch (e: any) {
      const name = e?.name ?? ""
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermState("denied")
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          setError("Microphone access denied. Go to Settings > Safari > Microphone and enable it, then try again.")
        } else {
          setError("Microphone access denied. Check your browser settings and allow microphone access, then tap the mic again.")
        }
      } else if (name === "NotFoundError") {
        setError("No microphone found on this device")
      } else {
        setError("Could not access microphone. Tap again to retry.")
      }
      return
    }

    setPermState("granted")

    let mimeType = getSupportedMimeType()
    if (!mimeType) {
      try { if (MediaRecorder.isTypeSupported("video/mp4")) mimeType = "video/mp4" } catch {}
    }

    let recorder: MediaRecorder
    try {
      if (mimeType?.startsWith("video/")) {
        const canvas = document.createElement("canvas")
        canvas.width = 2; canvas.height = 2
        const videoStream = canvas.captureStream(1)
        const audioTrack = stream.getAudioTracks()[0]
        const combined = new MediaStream([videoStream.getVideoTracks()[0], audioTrack])
        recorder = new MediaRecorder(combined, { mimeType })
        stream = combined
      } else if (mimeType) {
        recorder = new MediaRecorder(stream, { mimeType })
      } else {
        recorder = new MediaRecorder(stream)
        mimeType = recorder.mimeType
      }
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop())
      setError("Recording not supported on this device")
      return
    }

    mediaRecorder.current = recorder
    const ext = !mimeType || mimeType.includes("mp4") || mimeType.includes("aac") || mimeType.includes("3gpp") ? "mp4" : "webm"

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
      const { error: uploadError } = await supabase.storage.from("audio").upload(fileName, blob, { contentType: mimeType })
      if (uploadError) { setError("Upload failed"); setUploading(false); onDone(); return }

      const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(fileName)
      await supabase.from("messages").insert({
        conversation_id: conversationId, sender_id: senderId,
        content: null, audio_url: publicUrl,
      })

      fetch("/api/push/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, senderId, content: "Audio message" }),
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
    return <Button size="icon" variant="ghost" disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>
  }

  if (recording) {
    const m = Math.floor(duration / 60); const s = duration % 60
    return (
      <Button size="icon" variant="destructive" className="animate-pulse" onClick={stop} title={`${m}:${s.toString().padStart(2, "0")}`}>
        <Square className="h-4 w-4 fill-current" />
      </Button>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setError(""); startRecording() }}>
          <Mic className="h-4 w-4" />
        </Button>
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-xs w-full px-4">
          <div className="bg-destructive text-destructive-foreground text-sm rounded-lg shadow-lg p-3 animate-in fade-in slide-in-from-bottom-2">
            <p className="mb-2">{error}</p>
            <Button size="sm" variant="secondary" onClick={() => setError("")}>OK</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Button size="icon" variant="ghost" onClick={startRecording} title="Record audio">
      <Mic className="h-4 w-4" />
    </Button>
  )
}
