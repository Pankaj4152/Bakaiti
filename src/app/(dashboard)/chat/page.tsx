import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-muted-foreground">Select a user to start chatting</p>
    </div>
  )
}
