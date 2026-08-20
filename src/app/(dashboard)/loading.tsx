import { SpiralLoader } from "@/components/ui/spiral-loader"

export default function DashboardLoading() {
  return (
    <div className="relative flex h-full min-h-[50vh] items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.07),transparent_46%)]" />
      <SpiralLoader className="relative" size={128} label="Refreshing Bakaiti" />
    </div>
  )
}
