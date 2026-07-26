"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { log } from "@/lib/logger"

export function EditProfileDialog({
  email,
  currentName,
  currentUsername,
}: {
  email: string
  currentName: string
  currentUsername: string | null
}) {
  const [name, setName] = useState(currentName)
  const [username, setUsername] = useState(currentUsername ?? "")
  const [usernameError, setUsernameError] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const checkUsername = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    setUsername(clean)
    if (clean.length < 2 || clean === currentUsername) { setUsernameError(""); return }
    const res = await fetch("/api/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: clean, excludeEmail: email }),
    }).then((r) => r.json())
    setUsernameError(res.available ? "" : "Username taken")
  }

  const handleSave = async () => {
    if (usernameError) return
    setLoading(true)
    setError("")

    const res = await fetch("/api/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: name.trim(),
        username: username.trim(),
      }),
    })

    const body = await res.json()
    if (!res.ok) {
      setError(body.error || "Failed to save")
      setLoading(false)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Display Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Username</label>
            <Input
              value={username}
              onChange={(e) => checkUsername(e.target.value)}
              required
            />
            {usernameError && (
              <p className="text-xs text-red-500 mt-1">{usernameError}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" onClick={handleSave} disabled={loading || !!usernameError}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
