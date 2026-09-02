"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, RefreshCw, MessageSquare } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log unexpected errors
    console.error("Runtime Exception:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 text-zinc-900 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900">Something went wrong</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            An unexpected error occurred while loading chat data. Try reloading or return to the main app.
          </p>
        </div>

        {error.digest && (
          <div className="bg-zinc-100 p-2.5 rounded-lg border border-zinc-200 text-[11px] font-mono text-zinc-600 truncate">
            Error Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/chat"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium text-xs border border-zinc-200 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Return to Chat</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
