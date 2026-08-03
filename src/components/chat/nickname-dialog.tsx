"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

export function NicknameDialog({
  targetUserId,
  targetName,
  open,
  onOpenChange,
  hideTrigger = false,
}: {
  targetUserId: string
  targetName: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}) {
  const [localOpen, setLocalOpen] = useState(false)
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const isOpen = open ?? localOpen
  const setIsOpen = onOpenChange ?? setLocalOpen

  const save = async () => {
    setLoading(true)
    setSaved(false)
    const res = await fetch("/api/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, nickname: nickname.trim() }),
    })
    if (res.ok) {
      setSaved(true)
      window.dispatchEvent(new CustomEvent("bakaiti:nickname-updated", { detail: { targetUserId, nickname: nickname.trim() } }))
    }
    setLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Set Nickname</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nickname for {targetName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Set a custom name that only you see for {targetName}.
          </p>
          <Input
            placeholder={`Nickname for ${targetName}`}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={30}
            onKeyDown={(e) => { if (e.key === "Enter") save() }}
          />
          {saved && <p className="text-xs text-green-500">Nickname saved.</p>}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
            <Button onClick={save} disabled={loading}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}