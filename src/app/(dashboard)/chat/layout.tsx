import { UserList } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar/sidebar-context"
import { MobileSidebar } from "@/components/sidebar/mobile-sidebar"
import { PresenceTracker } from "@/components/presence-tracker"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <PresenceTracker />
      <div className="flex h-full w-full">
        <aside className="w-72 border-r flex-shrink-0 hidden md:flex flex-col">
          <UserList />
        </aside>
        <MobileSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
