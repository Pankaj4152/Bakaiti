"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

export function EditProfileDialog({
  email,
  currentName,
  currentUsername,
  currentAvatarUrl,
}: {
  email: string
  currentName: string
  currentUsername: string | null
  currentAvatarUrl: string | null
}) {
  const [name, setName] = useState(currentName)
  const [username, setUsername] = useState(currentUsername ?? "")
  const [usernameError, setUsernameError] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

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

    let avatarUrl = null
    if (avatarFile) {
      setUploadingAvatar(true)
      const ext = avatarFile.name.split(".").pop() ?? "png"
      const fileName = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile)

      if (uploadError) {
        setError("Failed to upload photo")
        setLoading(false)
        setUploadingAvatar(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName)
      avatarUrl = publicUrl
      setUploadingAvatar(false)
    }

    const res = await fetch("/api/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: name.trim(),
        username: username.trim(),
        avatar_url: avatarUrl,
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
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarPreview ?? currentAvatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">{currentName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setAvatarFile(file)
                  setAvatarPreview(URL.createObjectURL(file))
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {avatarFile ? "Change Photo" : "Upload Photo"}
            </Button>
          </div>
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
