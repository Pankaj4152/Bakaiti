import { SidebarProvider } from "@/components/sidebar/sidebar-context"
import { MobileSidebar } from "@/components/sidebar/mobile-sidebar"
import { DesktopSidebar } from "@/components/sidebar/desktop-sidebar"
import { PresenceTracker } from "@/components/presence-tracker"
import { ReminderChecker } from "@/components/reminder-checker"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <PresenceTracker />
      <ReminderChecker />
      <div className="flex h-full w-full">
        <DesktopSidebar />
        <MobileSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
