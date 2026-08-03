"use client"

import { useOnlineUsers } from "@/lib/realtime-presence"

export function PresenceDot({ userId, lastSeen }: { userId: string; lastSeen: string | null }) {
  const onlineSet = useOnlineUsers()
  const online = onlineSet.has(userId) || (!!lastSeen && Date.now() - new Date(lastSeen).getTime() < 120000)
  if (!online) return null
  return <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border-2 border-background" />
}

export function PresenceStatus({ userId, lastSeen }: { userId: string; lastSeen: string | null }) {
  const onlineSet = useOnlineUsers()
  const online = onlineSet.has(userId) || (!!lastSeen && Date.now() - new Date(lastSeen).getTime() < 120000)
  if (online) return <span className="text-green-500">● Online</span>
  if (!lastSeen) return null
  const diff = Date.now() - new Date(lastSeen).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return <>last seen now</>
  if (mins < 60) return <>last seen {mins}m ago</>
  const hours = Math.floor(mins / 60)
  if (hours < 24) return <>last seen {hours}h ago</>
  const days = Math.floor(hours / 24)
  return <>last seen {days}d ago</>
}
