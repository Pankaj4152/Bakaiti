"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"

export function ScanButton() {
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState(false)

  const trigger = async () => {
    setScanning(true)
    setDone(false)
    try {
      await fetch("/api/scan", { method: "POST" })
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch {}
    setScanning(false)
  }

  return (
    <div className="border-t p-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-xs h-8"
        onClick={trigger}
        disabled={scanning}
      >
        {scanning ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {scanning ? "Scanning..." : done ? "Done!" : "AI Scan"}
      </Button>
    </div>
  )
}
