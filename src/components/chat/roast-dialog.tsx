"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Flame, Loader2 } from "lucide-react"

export function RoastDialog({
  open,
  onOpenChange,
  roast,
  loading,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roast: string | null
  loading: boolean
  error: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Flame className="h-5 w-5 text-orange-500" />
            Roast Mode
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-[100px] flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cooking up a roast...</p>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-4">{error}</p>
          ) : roast ? (
            <p className="text-base leading-relaxed text-center py-4">&ldquo;{roast}&rdquo;</p>
          ) : null}
        </div>
        <div className="flex justify-center">
          <DialogClose asChild>
            <Button variant={roast ? "default" : "secondary"}>
              {roast ? "😂 Good one!" : "Close"}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
