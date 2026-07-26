"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SetupPage() {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { router.replace("/login"); return }
      const { data: profile } = await supabase
        .from("allowed_users")
        .select("name")
        .eq("email", user.email)
        .maybeSingle()
      if (profile?.name) setDisplayName(profile.name)
    }
    check()
  }, [])

  const checkUsername = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    setUsername(clean)
    if (clean.length < 2) { setUsernameError(""); return }
    const res = await fetch("/api/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: clean }),
    }).then((r) => r.json())
    setUsernameError(res.available ? "" : "Username taken")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameError) return

    setLoading(true)
    setError("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      router.replace("/login")
      return
    }

    const res = await fetch("/api/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        name: displayName.trim(),
        username,
      }),
    })

    if (!res.ok) {
      setError("Something went wrong. Try again.")
      setLoading(false)
      return
    }

    router.replace("/chat")
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome!</CardTitle>
          <CardDescription>Set your username and display name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => checkUsername(e.target.value)}
                required
                autoFocus
              />
              {usernameError && (
                <p className="text-xs text-red-500 mt-1">{usernameError}</p>
              )}
            </div>
            <Input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading || !!usernameError}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
