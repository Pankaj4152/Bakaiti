import { SpiralLoader } from "@/components/ui/spiral-loader"

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SpiralLoader size={120} label="Loading Bakaiti" />
    </div>
  )
}
