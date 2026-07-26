import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmptyChatState } from "./empty-state"

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return <EmptyChatState />
}
