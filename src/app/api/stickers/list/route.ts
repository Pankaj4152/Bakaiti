import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()

  const { data: packs } = await admin
    .from("sticker_packs")
    .select("id, name")
    .order("created_at", { ascending: false })

  if (!packs) return NextResponse.json({ packs: [] })

  const packIds = packs.map((p) => p.id)
  const { data: allStickers } = await admin
    .from("stickers")
    .select("id, image_url, pack_id")
    .in("pack_id", packIds)

  const stickerMap: Record<string, any[]> = {}
  if (allStickers) for (const s of allStickers) {
    if (!stickerMap[s.pack_id]) stickerMap[s.pack_id] = []
    stickerMap[s.pack_id].push(s)
  }

  const result = packs.map((p) => ({
    ...p,
    stickers: stickerMap[p.id] ?? [],
  }))

  return NextResponse.json({ packs: result })
}