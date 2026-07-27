import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const packName = (formData.get("packName") as string) || "My Pack"

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("allowed_users")
    .select("id, name")
    .eq("email", user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const ext = file.name.split(".").pop() ?? "png"
  const fileName = `${profile.id}_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("stickers")
    .upload(fileName, file)

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from("stickers").getPublicUrl(fileName)

  const { data: existingPack } = await admin
    .from("sticker_packs")
    .select("id")
    .eq("name", packName)
    .eq("creator_id", profile.id)
    .maybeSingle()

  let packId: string
  if (existingPack) {
    packId = existingPack.id
  } else {
    const { data: newPack } = await admin
      .from("sticker_packs")
      .insert({ name: packName, creator_id: profile.id, is_public: true })
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
