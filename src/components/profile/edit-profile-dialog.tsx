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

const THEMES = [
  { value: "default", label: "Default", class: "" },
  { value: "orange", label: "Orange", class: "bg-gradient-to-r from-orange-500 to-pink-500" },
  { value: "cyberpunk", label: "Cyberpunk", class: "bg-gradient-to-r from-fuchsia-500 to-cyan-500" },
  { value: "discord", label: "Discord", class: "bg-[#5865F2]" },
  { value: "whatsapp", label: "WhatsApp", class: "bg-[#075e54]" },
  { value: "terminal", label: "Terminal", class: "bg-[#00ff41] text-black" },
]

export function EditProfileDialog({
  email,
  currentName,
  currentUsername,
  currentAvatarUrl,
  currentStatusText = "",
  currentBio = "",
  currentTheme = "default",
}: {
  email: string
  currentName: string
  currentUsername: string | null
  currentAvatarUrl: string | null
  currentStatusText?: string | null
  currentBio?: string | null
  currentTheme?: string
}) {
  const [name, setName] = useState(currentName)
  const [username, setUsername] = useState(currentUsername ?? "")
  const [statusText, setStatusText] = useState(currentStatusText ?? "")
  const [bio, setBio] = useState(currentBio ?? "")
  const [usernameError, setUsernameError] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [theme, setTheme] = useState(currentTheme)
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

    let avatarUrl: string | undefined
    if (avatarFile) {
      setUploadingAvatar(true)
      const ext = avatarFile.name.split(".").pop() ?? "png"
      const fileName = `${email.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.${ext}`
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

    const body: Record<string, any> = {
      email,
      name: name.trim(),
      username: username.trim(),
      status_text: statusText.trim(),
      bio: bio.trim(),
    }
    if (avatarUrl) body.avatar_url = avatarUrl

    const res = await fetch("/api/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || "Failed to save")
      setLoading(false)
      return
    }

    await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    })

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
          <div>
            <label className="text-sm font-medium mb-1 block">Custom Status</label>
            <Input
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="🚀 Building Bakaiti"
              maxLength={40}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">About Me / Bio</label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell friends about yourself..."
              maxLength={120}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Chat Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                    theme === t.value ? "ring-2 ring-primary border-primary" : "hover:bg-accent"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full ${t.class}`} />
                  {t.label}
                </button>
              ))}
            </div>
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
