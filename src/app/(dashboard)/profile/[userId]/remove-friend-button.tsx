"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RemoveFriendButton({ friendshipId, friendName }: { friendshipId: string; friendName: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const removeFriend = async () => {
    if (!window.confirm(`Remove ${friendName} from your friends? Your old chat will be kept.`)) return
    setLoading(true)
    setError("")
    const response = await fetch("/api/friend-requests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: friendshipId }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error ?? "Could not remove friend")
      setLoading(false)
      return
    }
    router.push("/chat")
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="destructive" size="sm" onClick={removeFriend} disabled={loading}>
        <UserMinus />
        {loading ? "Removing..." : "Remove friend"}
      </Button>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}
