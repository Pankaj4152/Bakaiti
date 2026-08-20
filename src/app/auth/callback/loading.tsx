import { EyeLoader } from "@/components/ui/eye-loader"

export default function CallbackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <EyeLoader size={84} />
    </div>
  )
}
