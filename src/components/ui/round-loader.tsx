import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function RoundLoader({ className, size = 28, viewport = false }: { className?: string; size?: number; viewport?: boolean }) {
  return (
    <div className={cn(viewport ? "fixed inset-0 z-40 flex items-center justify-center bg-background" : "inline-flex items-center justify-center", className)} role="status" aria-label="Loading">
      <Loader2 className="animate-spin text-muted-foreground" style={{ width: size, height: size }} aria-hidden="true" />
    </div>
  )
}
