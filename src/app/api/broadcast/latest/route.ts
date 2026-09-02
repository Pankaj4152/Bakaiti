import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data: latest, error } = await admin
      .from("system_broadcasts")
      .select("id, title, message, type, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && !error.message.includes("does not exist")) {
      return NextResponse.json({ broadcast: null })
    }

    return NextResponse.json({ broadcast: latest ?? null })
  } catch {
    return NextResponse.json({ broadcast: null })
  }
}
