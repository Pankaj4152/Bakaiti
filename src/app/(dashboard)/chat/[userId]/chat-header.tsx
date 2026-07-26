"use client"

import { useSidebar } from "@/components/sidebar/sidebar-context"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function MobileMenuButton() {
  const { setOpen } = useSidebar()
  return (
    <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setOpen(true)}>
      <Menu className="h-5 w-5" />
    </Button>
  )
}
