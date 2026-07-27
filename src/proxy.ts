import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { log } from "@/lib/logger"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/access-denied") ||
    pathname.startsWith("/pending") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/site.webmanifest"
  ) {
    log.info("MIDDLEWARE", "Public path:", pathname)
    return await updateSession(request)
  }

  log.info("MIDDLEWARE", "Protected path:", pathname)

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    log.info("MIDDLEWARE", "No user, redirecting to login")
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  log.info("MIDDLEWARE", "User authorized:", user.email)
  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
