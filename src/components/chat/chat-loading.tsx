import { Skeleton } from "@/components/ui/skeleton"
import { SpiralLoader } from "@/components/ui/spiral-loader"

export function ChatLoadingShell({ group = false }: { group?: boolean }) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b px-3 sm:px-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        {group && <Skeleton className="-ml-5 h-8 w-8 rounded-full border-2 border-background" />}
        <div className="space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-2.5 w-16 opacity-60" /></div>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.06),transparent_48%)]" />
        <SpiralLoader className="relative" size={112} label="Loading chat" />
      </div>
      <div className="flex h-[70px] flex-shrink-0 items-center gap-2 border-t px-3 sm:px-4">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  )
}
