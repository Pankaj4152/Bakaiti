"use client"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { UserList } from "./user-list"
import { useSidebar } from "./sidebar-context"

export function MobileSidebar() {
  const { open, setOpen } = useSidebar()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="p-0 w-72">
        <SheetTitle className="sr-only">Chat navigation</SheetTitle>
        <UserList onNav={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
