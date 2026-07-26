"use client"

import { createContext, useContext, useState, useCallback } from "react"

const SidebarContext = createContext<{
  open: boolean
  setOpen: (v: boolean) => void
  refreshKey: number
  refreshConversations: () => void
}>({ open: false, setOpen: () => {}, refreshKey: 0, refreshConversations: () => {} })

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refreshConversations = useCallback(() => setRefreshKey((k) => k + 1), [])
  return (
    <SidebarContext.Provider value={{ open, setOpen, refreshKey, refreshConversations }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
