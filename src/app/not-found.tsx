import Link from "next/link"
import { MessageSquare, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 text-zinc-900 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto border border-zinc-200 font-bold text-lg">
          404
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900">Page Not Found</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            The conversation, page, or destination you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Bakaiti Chat</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
