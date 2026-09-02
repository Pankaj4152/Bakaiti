import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmptyChatState } from "./empty-state"
import { UserList } from "@/components/sidebar/user-list"

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="flex-1 h-full w-full flex flex-col min-w-0">
      {/* Mobile view: full screen conversations home list (like WhatsApp / Instagram) */}
      <div className="md:hidden flex-1 h-full w-full overflow-y-auto">
        <UserList />
      </div>

      {/* Desktop view: empty state banner prompting user to select a chat */}
      <div className="hidden md:flex flex-1 h-full w-full">
        <EmptyChatState />
      </div>
    </div>
  )
}
