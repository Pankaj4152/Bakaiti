import { SpiralLoader } from "@/components/ui/spiral-loader"

export default function CallbackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SpiralLoader size={120} label="Signing you in" />
    </div>
  )
}
