"use client"

import { useState } from "react"
import { Plus, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddUserDialog } from "./add-user-dialog"
import { CreateGroupDialog } from "./create-group-dialog"

export function NewActionsDialog() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)

  const choose = (action: "friend" | "group") => {
    setMenuOpen(false)
    if (action === "friend") setAddFriendOpen(true)
    else setCreateGroupOpen(true)
  }

  return (
    <>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Start something">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start something</DialogTitle>
            <DialogDescription>Find your people or start a new group bakaiti.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 pt-2">
            <button onClick={() => choose("friend")} className="flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><UserPlus /></span>
              <span><span className="block text-sm font-semibold">Add new friend</span><span className="text-xs text-muted-foreground">Search using their exact username</span></span>
            </button>
            <button onClick={() => choose("group")} className="flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Users /></span>
              <span><span className="block text-sm font-semibold">Create a group</span><span className="text-xs text-muted-foreground">Bring your gang into one chat</span></span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <AddUserDialog open={addFriendOpen} onOpenChange={setAddFriendOpen} showTrigger={false} />
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} showTrigger={false} />
    </>
  )
}
