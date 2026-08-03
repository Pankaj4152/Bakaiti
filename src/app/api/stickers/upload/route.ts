import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth"

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"])
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const packName = (formData.get("packName") as string) || "My Pack"

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 })

  // Validate MIME type and size server-side.
  const mime = (file.type || "").toLowerCase()
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json({ error: "Only PNG, JPEG, WebP, GIF, or SVG images allowed" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 })
  }

  const admin = createAdminClient()

  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "svg"
  const fileName = `${user.id}_${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from("stickers")
    .upload(fileName, file, { contentType: mime })

  if (uploadError) return NextResponse.json({ error: "Upload failed" }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from("stickers").getPublicUrl(fileName)

  const { data: existingPack } = await admin
    .from("sticker_packs")
    .select("id")
    .eq("name", packName)
    .eq("creator_id", user.id)
    .maybeSingle()

  let packId: string
  if (existingPack) {
    packId = existingPack.id
  } else {
    const { data: newPack } = await admin
      .from("sticker_packs")
      .insert({ name: packName, creator_id: user.id, is_public: true })
      .select("id")
      .single()
    if (!newPack) return NextResponse.json({ error: "Failed to create pack" }, { status: 500 })
    packId = newPack.id
  }

  const { data: sticker } = await admin
    .from("stickers")
    .insert({ pack_id: packId, image_url: publicUrl })
    .select("id")
    .single()

  if (!sticker) return NextResponse.json({ error: "Failed to save sticker" }, { status: 500 })

  return NextResponse.json({ packId, stickerId: sticker.id, imageUrl: publicUrl })
}