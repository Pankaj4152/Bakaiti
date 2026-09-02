import { SidebarProvider } from "@/components/sidebar/sidebar-context"
import { MobileSidebar } from "@/components/sidebar/mobile-sidebar"
import { DesktopSidebar } from "@/components/sidebar/desktop-sidebar"
import { PresenceTracker } from "@/components/presence-tracker"
import { ReminderChecker } from "@/components/reminder-checker"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <PresenceTracker />
      <ReminderChecker />
      <div className="flex flex-col h-full w-full">
        <ImpersonationBanner />
        <div className="flex flex-1 h-full w-full min-h-0">
          <DesktopSidebar />
          <MobileSidebar />
          <main className="flex-1 flex flex-col min-w-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
