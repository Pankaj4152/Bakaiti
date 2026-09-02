"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, User, Volume2, VolumeX, LogOut, HelpCircle, ChevronRight } from "lucide-react"
import { sounds } from "@/lib/sounds"
import { createClient } from "@/lib/supabase/client"
import { HelpDialog } from "./help-dialog"

interface Profile {
  id: string
  name: string
  username: string
  avatar_url: string | null
}

export function SettingsDialog({
  profile,
  soundEnabled,
  onToggleSound,
  onNav,
}: {
  profile: Profile | null
  soundEnabled: boolean
  onToggleSound: () => void
  onNav?: () => void
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    router.push("/login")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Settings & Account"
        >
          <Settings className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl p-5 font-sans">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-base font-bold">Settings & Account</DialogTitle>
        </DialogHeader>

        {profile && (
          <div
            onClick={() => {
              setOpen(false)
              onNav?.()
              router.push(`/profile/${profile.id}`)
            }}
            className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent cursor-pointer transition-colors border border-border/50"
          >
            <Avatar className="h-11 w-11 border border-border">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="font-bold text-sm">
                {profile.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{profile.name}</h4>
              <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        )}

        <div className="space-y-1.5 pt-1">
          {profile && (
            <Button
              variant="ghost"
              className="w-full justify-between h-10 px-3 text-sm font-medium"
              onClick={() => {
                setOpen(false)
                onNav?.()
                router.push(`/profile/${profile.id}`)
              }}
            >
              <span className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>View Profile & Badges</span>
              </span>
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full justify-between h-10 px-3 text-sm font-medium"
            onClick={onToggleSound}
          >
            <span className="flex items-center gap-2.5">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Sound Effects</span>
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {soundEnabled ? "ON" : "OFF"}
            </span>
          </Button>

          <div className="pt-0.5">
            <HelpDialog placement="footer" />
          </div>

          <div className="pt-2 border-t border-border mt-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-10 px-3 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2.5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
