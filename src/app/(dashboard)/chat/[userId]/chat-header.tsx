"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function MobileMenuButton() {
  return (
    <Link
      href="/chat"
      className="md:hidden p-2 rounded-full hover:bg-white/10 text-foreground shrink-0 flex items-center justify-center transition-colors"
      aria-label="Back to chat list"
    >
      <ArrowLeft className="h-5 w-5" />
    </Link>
  )
}
