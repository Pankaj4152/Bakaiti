import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { log } from "@/lib/logger"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) { log.info("DASHBOARD", "No user, redirecting to login"); redirect("/login") }

  log.info("DASHBOARD", "User:", user.email)

  const { data: profile } = await supabase
    .from("allowed_users")
    .select("name, username, status")
    .eq("email", user.email)
    .maybeSingle()

  log.info("DASHBOARD", "Profile:", profile)

  if (!profile) { log.info("DASHBOARD", "No profile row, redirecting to login"); redirect("/login") }
  if (profile.status !== "approved") { log.info("DASHBOARD", "Status not approved:", profile.status, "-> /pending"); redirect("/pending") }
  if (!profile?.name?.trim() || !profile?.username?.trim()) { log.info("DASHBOARD", "Missing name/username, -> /setup"); redirect("/setup") }

  log.info("DASHBOARD", "All checks passed, rendering")
  return (
    <div className="flex h-full w-full">
      {children}
    </div>
  )
}
