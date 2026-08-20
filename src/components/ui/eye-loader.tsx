import { cn } from "@/lib/utils"

export function EyeLoader({ className, size = 72 }: { className?: string; size?: number }) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)} role="status" aria-label="Loading">
      <span className="bakaiti-eye-loader select-none leading-none" style={{ fontSize: size }} aria-hidden="true">👀</span>
    </div>
  )
}
