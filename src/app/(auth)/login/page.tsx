"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { log } from "@/lib/logger"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const router = useRouter()
  const supabase = createClient()

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
    setLoading(true)
    setError("")

    if (mode === "signin") {
      log.info("SIGNIN", "Attempting sign in for", email)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        log.warn("SIGNIN", "Failed:", error.message)
        if (error.message.includes("Invalid login")) {
          setMode("signup")
          setError("No account yet. Create one below.")
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }
      log.info("SIGNIN", "Auth success, checking approval")

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const statusRes = await fetch("/api/check-status")
        const { status: userStatus } = await statusRes.json()

        log.info("SIGNIN", "Profile status:", userStatus)

        if (userStatus !== "approved") {
          log.info("SIGNIN", "Not approved, signing out")
          await supabase.auth.signOut()
          router.replace("/pending")
          return
        }
      }

      log.info("SIGNIN", "Approved, redirecting to chat")
      router.replace("/chat")
    } else {
      if (usernameError) { setLoading(false); return }

      log.info("SIGNUP", "Creating auth account for", email)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        log.error("SIGNUP", "Auth creation failed:", error.message)
        if (error.message.includes("rate_limit")) {
          setError("Too many attempts. Please wait an hour and try again.")
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }
      log.info("SIGNUP", "Auth account created, creating allowed_users entry")

      const profileRes = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: displayName.trim() || username,
          username,
          status: "pending",
        }),
      })

      const resBody = await profileRes.json().catch(() => ({}))
      log.info("SIGNUP", "Profile API response:", profileRes.status, resBody)

      if (!profileRes.ok) {
        setError(`Profile creation failed: ${resBody.error || "Unknown error"}`)
        setLoading(false)
        return
      }

      log.info("SIGNUP", "Done, redirecting to pending")
      router.replace("/pending")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Chitput</CardTitle>
          <CardDescription>Private chat for the squad</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === "signup" && (
              <>
                <div>
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => checkUsername(e.target.value)}
                    required
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
              </>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</> : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  className="underline hover:text-foreground"
                  onClick={() => { setMode("signup"); setError("") }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Have an account?{" "}
                <button
                  className="underline hover:text-foreground"
                  onClick={() => { setMode("signin"); setError("") }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
