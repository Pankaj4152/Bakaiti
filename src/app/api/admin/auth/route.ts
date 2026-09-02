import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid Admin Password" }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set("bakaiti_admin_token", "secret_admin_session_granted", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 86400 * 7, // 7 days
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Authentication failed" }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("bakaiti_admin_token")
  return NextResponse.json({ success: true })
}
